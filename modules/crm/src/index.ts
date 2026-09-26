import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import { leads, executorFrom, type DbExecutor } from '@avitus/database';
import type { DomainEventStore } from '@avitus/events';
import {
  DomainError,
  newDomainEvent,
  type RequestContext,
  type TransactionContext,
  type UnitOfWork,
} from '@avitus/shared';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

export const createLeadSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  source: z.string().trim().min(1).max(120).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  assignedToUserId: z.string().uuid().optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type LeadStatus =
  | 'NEW'
  | 'CONTACT_PENDING'
  | 'CONTACTED'
  | 'QUALIFYING'
  | 'QUALIFIED'
  | 'DISCOVERY'
  | 'CONFIGURING'
  | 'QUOTE_PENDING'
  | 'QUOTED'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'DORMANT'
  | 'DISQUALIFIED';
export type LeadPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Lead {
  id: string;
  organizationId: string;
  title?: string;
  source?: string;
  status: LeadStatus;
  priority: LeadPriority;
  assignedToUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createLead(organizationId: string, input: CreateLeadInput): Lead {
  if (!organizationId) throw new DomainError('CRM.ORGANIZATION_REQUIRED', 'Organization is required.');
  const now = new Date();
  return {
    id: randomUUID(),
    organizationId,
    ...(input.title ? { title: input.title } : {}),
    ...(input.source ? { source: input.source } : {}),
    status: 'NEW',
    priority: input.priority,
    ...(input.assignedToUserId ? { assignedToUserId: input.assignedToUserId } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

export interface LeadRepository {
  insert(lead: Lead, tx?: TransactionContext): Promise<void>;
  listByOrganization(organizationId: string): Promise<Lead[]>;
  findById(organizationId: string, leadId: string): Promise<Lead | null>;
}

function rowToLead(row: typeof leads.$inferSelect): Lead {
  return {
    id: row.id,
    organizationId: row.organizationId,
    ...(row.title ? { title: row.title } : {}),
    ...(row.source ? { source: row.source } : {}),
    status: row.status,
    priority: row.priority,
    ...(row.assignedToUserId ? { assignedToUserId: row.assignedToUserId } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresLeadRepository implements LeadRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(lead: Lead, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(leads).values({
      id: lead.id,
      organizationId: lead.organizationId,
      title: lead.title,
      source: lead.source,
      status: lead.status,
      priority: lead.priority,
      assignedToUserId: lead.assignedToUserId,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    });
  }

  async listByOrganization(organizationId: string): Promise<Lead[]> {
    const rows = await this.db
      .select()
      .from(leads)
      .where(eq(leads.organizationId, organizationId))
      .orderBy(desc(leads.createdAt));
    return rows.map(rowToLead);
  }

  async findById(organizationId: string, leadId: string): Promise<Lead | null> {
    const rows = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.organizationId, organizationId), eq(leads.id, leadId)))
      .limit(1);
    return rows[0] ? rowToLead(rows[0]) : null;
  }
}

export class CreateLeadService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly leads: LeadRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<Lead> {
    if (!context.permissions.has('crm.lead.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing crm.lead.write permission.');
    }
    const input = createLeadSchema.parse(rawInput);
    const lead = createLead(context.organizationId, input);
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'LeadCreated',
      aggregateType: 'Lead',
      aggregateId: lead.id,
      payload: {
        leadId: lead.id,
        status: lead.status,
        priority: lead.priority,
        ...(lead.source ? { source: lead.source } : {}),
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    await this.uow.run(async (tx) => {
      await this.leads.insert(lead, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Lead',
          entityId: lead.id,
          action: 'CREATE',
          afterData: {
            id: lead.id,
            organizationId: lead.organizationId,
            status: lead.status,
            priority: lead.priority,
            title: lead.title ?? null,
            source: lead.source ?? null,
          },
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    return lead;
  }
}

export class ReadLeadService {
  constructor(private readonly leads: LeadRepository) {}

  async list(context: RequestContext): Promise<Lead[]> {
    if (!context.permissions.has('crm.lead.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing crm.lead.read permission.');
    }
    return this.leads.listByOrganization(context.organizationId);
  }

  async byId(leadId: string, context: RequestContext): Promise<Lead> {
    if (!context.permissions.has('crm.lead.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing crm.lead.read permission.');
    }
    const lead = await this.leads.findById(context.organizationId, leadId);
    if (!lead) throw new DomainError('CRM.LEAD_NOT_FOUND', 'Lead was not found.');
    return lead;
  }
}
