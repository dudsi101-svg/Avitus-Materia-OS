import { randomUUID } from 'node:crypto';
import type { AuditEntry, AuditStore } from '@avitus/audit';
import { executorFrom, leads, opportunities, type DbExecutor } from '@avitus/database';
import type { DomainEventStore } from '@avitus/events';
import {
  DomainError,
  newDomainEvent,
  type DomainEvent,
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

export const createOpportunitySchema = z.object({
  leadId: z.string().uuid(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional(),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('PLN'),
  probability: z.coerce.number().int().min(0).max(100).default(25),
  expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type OpportunityStatus =
  | 'OPEN'
  | 'DISCOVERY'
  | 'SOLUTION_DEFINED'
  | 'PRICING'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'COMMIT'
  | 'WON'
  | 'LOST'
  | 'ON_HOLD';

export interface Opportunity {
  id: string;
  organizationId: string;
  leadId: string;
  ownerUserId?: string;
  title: string;
  description?: string;
  status: OpportunityStatus;
  estimatedValue?: string;
  currency: string;
  probability: number;
  expectedCloseDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpportunityRepository {
  insert(opportunity: Opportunity, tx?: TransactionContext): Promise<void>;
  listByOrganization(organizationId: string): Promise<Opportunity[]>;
  findById(organizationId: string, opportunityId: string): Promise<Opportunity | null>;
}

function rowToOpportunity(row: typeof opportunities.$inferSelect): Opportunity {
  return {
    id: row.id,
    organizationId: row.organizationId,
    leadId: row.leadId,
    ...(row.ownerUserId ? { ownerUserId: row.ownerUserId } : {}),
    title: row.title,
    ...(row.description ? { description: row.description } : {}),
    status: row.status,
    ...(row.estimatedValue ? { estimatedValue: row.estimatedValue } : {}),
    currency: row.currency,
    probability: row.probability,
    ...(row.expectedCloseDate ? { expectedCloseDate: row.expectedCloseDate } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresOpportunityRepository implements OpportunityRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(opportunity: Opportunity, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(opportunities).values({
      id: opportunity.id,
      organizationId: opportunity.organizationId,
      leadId: opportunity.leadId,
      ownerUserId: opportunity.ownerUserId,
      title: opportunity.title,
      description: opportunity.description,
      status: opportunity.status,
      estimatedValue: opportunity.estimatedValue,
      currency: opportunity.currency,
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate,
      createdAt: opportunity.createdAt,
      updatedAt: opportunity.updatedAt,
    });
  }

  async listByOrganization(organizationId: string): Promise<Opportunity[]> {
    const rows = await this.db
      .select()
      .from(opportunities)
      .where(eq(opportunities.organizationId, organizationId))
      .orderBy(desc(opportunities.createdAt));
    return rows.map(rowToOpportunity);
  }

  async findById(organizationId: string, opportunityId: string): Promise<Opportunity | null> {
    const rows = await this.db
      .select()
      .from(opportunities)
      .where(and(eq(opportunities.organizationId, organizationId), eq(opportunities.id, opportunityId)))
      .limit(1);
    return rows[0] ? rowToOpportunity(rows[0]) : null;
  }
}

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

/**
 * Builds a new Opportunity with its event and audit entry without persisting anything, so other
 * modules can create it inside their own Unit of Work (e.g. acquisition request conversion).
 * The caller is responsible for authorization and for verifying the Lead.
 */
export function planOpportunityCreation(
  input: CreateOpportunityInput,
  context: RequestContext,
): { opportunity: Opportunity; event: DomainEvent; audit: AuditEntry } {
  const now = new Date();
  const opportunity: Opportunity = {
    id: randomUUID(),
    organizationId: context.organizationId,
    leadId: input.leadId,
    ...(context.actor.type === 'USER' ? { ownerUserId: context.actor.id } : {}),
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    status: 'OPEN',
    ...(input.estimatedValue !== undefined ? { estimatedValue: input.estimatedValue.toFixed(4) } : {}),
    currency: input.currency,
    probability: input.probability,
    ...(input.expectedCloseDate ? { expectedCloseDate: input.expectedCloseDate } : {}),
    createdAt: now,
    updatedAt: now,
  };

  const event = newDomainEvent({
    organizationId: context.organizationId,
    eventType: 'OpportunityCreated',
    aggregateType: 'Opportunity',
    aggregateId: opportunity.id,
    payload: {
      opportunityId: opportunity.id,
      leadId: opportunity.leadId,
      status: opportunity.status,
      currency: opportunity.currency,
      probability: opportunity.probability,
    },
    correlationId: context.correlationId,
    actor: context.actor,
  });
  const audit: AuditEntry = {
    organizationId: context.organizationId,
    actor: context.actor,
    entityType: 'Opportunity',
    entityId: opportunity.id,
    action: 'CREATE',
    afterData: {
      id: opportunity.id,
      leadId: opportunity.leadId,
      status: opportunity.status,
      estimatedValue: opportunity.estimatedValue ?? null,
      currency: opportunity.currency,
      probability: opportunity.probability,
    },
    correlationId: context.correlationId,
  };
  return { opportunity, event, audit };
}

export class CreateOpportunityService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly leads: LeadRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<Opportunity> {
    if (!context.permissions.has('crm.opportunity.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing crm.opportunity.write permission.');
    }
    const input = createOpportunitySchema.parse(rawInput);
    const lead = await this.leads.findById(context.organizationId, input.leadId);
    if (!lead) throw new DomainError('CRM.LEAD_NOT_FOUND', 'Lead was not found in this organization.');

    const { opportunity, event, audit } = planOpportunityCreation(input, context);

    await this.uow.run(async (tx) => {
      await this.opportunities.insert(opportunity, tx);
      await this.events.append(event, tx);
      await this.audit.append(audit, tx);
    });
    return opportunity;
  }
}

export class ReadOpportunityService {
  constructor(private readonly opportunities: OpportunityRepository) {}

  async list(context: RequestContext): Promise<Opportunity[]> {
    if (!context.permissions.has('crm.opportunity.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing crm.opportunity.read permission.');
    }
    return this.opportunities.listByOrganization(context.organizationId);
  }

  async byId(opportunityId: string, context: RequestContext): Promise<Opportunity> {
    if (!context.permissions.has('crm.opportunity.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing crm.opportunity.read permission.');
    }
    const opportunity = await this.opportunities.findById(context.organizationId, opportunityId);
    if (!opportunity) throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    return opportunity;
  }
}
