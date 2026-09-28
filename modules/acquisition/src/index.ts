import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { ProductRepository } from '@avitus/catalog';
import { assessConfiguration } from '@avitus/configurator';
import { createLead, type LeadRepository } from '@avitus/crm';
import {
  executorFrom,
  publicConfigurationRequests,
  publicInquirySubmissions,
  type DbExecutor,
} from '@avitus/database';
import type { DomainEventStore } from '@avitus/events';
import {
  DomainError,
  newDomainEvent,
  type RequestContext,
  type TransactionContext,
  type UnitOfWork,
} from '@avitus/shared';
import { z } from 'zod';

export const publicInquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().default(''),
  projectType: z.enum(['CUSTOM_FURNITURE', 'TABLE', 'INTERIOR', 'OLD_WOOD', 'OTHER']),
  message: z.string().trim().min(10).max(3000),
  companyWebsite: z.literal('').optional().default(''),
});

export type PublicInquiryInput = z.infer<typeof publicInquirySchema>;

export interface PublicInquirySubmission {
  id: string;
  organizationId: string;
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  projectType: PublicInquiryInput['projectType'];
  message: string;
  source: 'PUBLIC_WEB';
  createdAt: Date;
}

export interface PublicInquiryRepository {
  insert(submission: PublicInquirySubmission, tx?: TransactionContext): Promise<void>;
}

export class PostgresPublicInquiryRepository implements PublicInquiryRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(submission: PublicInquirySubmission, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(publicInquirySubmissions).values({
      id: submission.id,
      organizationId: submission.organizationId,
      leadId: submission.leadId,
      name: submission.name,
      email: submission.email,
      phone: submission.phone,
      projectType: submission.projectType,
      message: submission.message,
      source: submission.source,
      createdAt: submission.createdAt,
    });
  }
}

const projectLabels: Record<PublicInquiryInput['projectType'], string> = {
  CUSTOM_FURNITURE: 'Mebel na zamówienie',
  TABLE: 'Stół / blat',
  INTERIOR: 'Elementy wnętrza',
  OLD_WOOD: 'Projekt ze starego drewna',
  OTHER: 'Inny projekt',
};

export class CreatePublicInquiryService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly leads: LeadRepository,
    private readonly inquiries: PublicInquiryRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<{ leadId: string; inquiryId: string }> {
    if (!context.permissions.has('acquisition.public_inquiry.create')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing acquisition.public_inquiry.create permission.');
    }

    const input = publicInquirySchema.parse(rawInput);
    const lead = createLead(context.organizationId, {
      title: `${input.name} — ${projectLabels[input.projectType]}`,
      source: 'PUBLIC_WEB',
      priority: 'NORMAL',
    });
    const submission: PublicInquirySubmission = {
      id: randomUUID(),
      organizationId: context.organizationId,
      leadId: lead.id,
      name: input.name,
      email: input.email.toLowerCase(),
      ...(input.phone ? { phone: input.phone } : {}),
      projectType: input.projectType,
      message: input.message,
      source: 'PUBLIC_WEB',
      createdAt: new Date(),
    };

    const leadEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'LeadCreated',
      aggregateType: 'Lead',
      aggregateId: lead.id,
      payload: {
        leadId: lead.id,
        status: lead.status,
        priority: lead.priority,
        source: 'PUBLIC_WEB',
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    const inquiryEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'PublicInquiryReceived',
      aggregateType: 'PublicInquirySubmission',
      aggregateId: submission.id,
      payload: {
        inquiryId: submission.id,
        leadId: lead.id,
        projectType: submission.projectType,
        source: submission.source,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.leads.insert(lead, tx);
      await this.inquiries.insert(submission, tx);
      await this.events.append(leadEvent, tx);
      await this.events.append(inquiryEvent, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Lead',
          entityId: lead.id,
          action: 'CREATE_FROM_PUBLIC_INQUIRY',
          afterData: {
            id: lead.id,
            status: lead.status,
            priority: lead.priority,
            source: lead.source ?? null,
          },
          correlationId: context.correlationId,
        },
        tx,
      );
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'PublicInquirySubmission',
          entityId: submission.id,
          action: 'CREATE',
          afterData: {
            id: submission.id,
            leadId: submission.leadId,
            projectType: submission.projectType,
            source: submission.source,
          },
          correlationId: context.correlationId,
        },
        tx,
      );
    });

    return { leadId: lead.id, inquiryId: submission.id };
  }
}

// --- Public configurator requests (Sprint 5, DD-025) ---

export const publicConfigurationRequestSchema = z.object({
  productId: z.string().uuid(),
  values: z.record(z.string().max(120), z.union([z.number().finite(), z.string().max(200), z.boolean()])),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().default(''),
  message: z.string().trim().max(3000).optional().default(''),
  companyWebsite: z.literal('').optional().default(''),
});

export type PublicConfigurationRequestInput = z.infer<typeof publicConfigurationRequestSchema>;

export interface PublicConfigurationRequest {
  id: string;
  organizationId: string;
  leadId: string;
  productId: string;
  productSku: string;
  productName: string;
  optionValues: Record<string, unknown>;
  configurationStatus: 'INCOMPLETE' | 'READY_FOR_PRICING';
  readinessIssues: string[];
  name: string;
  email: string;
  phone?: string;
  message?: string;
  source: 'PUBLIC_CONFIGURATOR';
  createdAt: Date;
}

export interface PublicConfigurationRequestRepository {
  insert(request: PublicConfigurationRequest, tx?: TransactionContext): Promise<void>;
}

export class PostgresPublicConfigurationRequestRepository implements PublicConfigurationRequestRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(request: PublicConfigurationRequest, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(publicConfigurationRequests).values({
      id: request.id,
      organizationId: request.organizationId,
      leadId: request.leadId,
      productId: request.productId,
      productSku: request.productSku,
      productName: request.productName,
      optionValues: request.optionValues,
      configurationStatus: request.configurationStatus,
      readinessIssues: request.readinessIssues,
      name: request.name,
      email: request.email,
      phone: request.phone,
      message: request.message,
      source: request.source,
      createdAt: request.createdAt,
    });
  }
}

export class CreatePublicConfigurationRequestService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly products: ProductRepository,
    private readonly leads: LeadRepository,
    private readonly requests: PublicConfigurationRequestRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(
    rawInput: unknown,
    context: RequestContext,
  ): Promise<{ leadId: string; requestId: string; configurationStatus: PublicConfigurationRequest['configurationStatus'] }> {
    if (!context.permissions.has('acquisition.public_configuration_request.create')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing acquisition.public_configuration_request.create permission.');
    }

    const input = publicConfigurationRequestSchema.parse(rawInput);
    const product = await this.products.findActiveById(context.organizationId, input.productId);
    if (!product || product.productType !== 'CONFIGURABLE') {
      throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    // Same validation as the Core configurator: unknown options, ranges and choices are rejected.
    const assessment = assessConfiguration(product, input.values);

    const lead = createLead(context.organizationId, {
      title: `${input.name} — Kreator: ${product.name}`,
      source: 'PUBLIC_CONFIGURATOR',
      priority: 'NORMAL',
    });
    const request: PublicConfigurationRequest = {
      id: randomUUID(),
      organizationId: context.organizationId,
      leadId: lead.id,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      optionValues: input.values,
      configurationStatus: assessment.status,
      readinessIssues: assessment.readinessIssues,
      name: input.name,
      email: input.email.toLowerCase(),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.message ? { message: input.message } : {}),
      source: 'PUBLIC_CONFIGURATOR',
      createdAt: new Date(),
    };

    const leadEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'LeadCreated',
      aggregateType: 'Lead',
      aggregateId: lead.id,
      payload: { leadId: lead.id, status: lead.status, priority: lead.priority, source: 'PUBLIC_CONFIGURATOR' },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    // PII (name, email, phone, message) stays in the intake record only.
    const requestSummary = {
      requestId: request.id,
      leadId: lead.id,
      productId: product.id,
      productSku: product.sku,
      configurationStatus: request.configurationStatus,
      source: request.source,
    };
    const requestEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'PublicConfigurationRequestReceived',
      aggregateType: 'PublicConfigurationRequest',
      aggregateId: request.id,
      payload: requestSummary,
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.leads.insert(lead, tx);
      await this.requests.insert(request, tx);
      await this.events.append(leadEvent, tx);
      await this.events.append(requestEvent, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Lead',
          entityId: lead.id,
          action: 'CREATE_FROM_PUBLIC_CONFIGURATOR',
          afterData: { id: lead.id, status: lead.status, priority: lead.priority, source: lead.source ?? null },
          correlationId: context.correlationId,
        },
        tx,
      );
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'PublicConfigurationRequest',
          entityId: request.id,
          action: 'CREATE',
          afterData: requestSummary,
          correlationId: context.correlationId,
        },
        tx,
      );
    });

    return { leadId: lead.id, requestId: request.id, configurationStatus: request.configurationStatus };
  }
}
