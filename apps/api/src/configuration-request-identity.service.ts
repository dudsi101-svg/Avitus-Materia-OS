import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { ConfigurationRequestReadRepository, ConfigurationRequestView } from '@avitus/acquisition';
import type { LeadRepository, OpportunityRepository } from '@avitus/crm';
import {
  normalizeContactValue,
  type ContactPoint,
  type CustomerAccount,
  type CustomerAccountRepository,
  type CustomerLinkRepository,
} from '@avitus/customers';
import type { DomainEventStore } from '@avitus/events';
import {
  DomainError,
  newDomainEvent,
  type RequestContext,
  type TransactionContext,
  type UnitOfWork,
} from '@avitus/shared';
import { z } from 'zod';

const linkExistingSchema = z.object({ customerAccountId: z.string().uuid() });
const createPersonSchema = z.object({
  firstName: z.string().trim().min(1).max(160),
  lastName: z.string().trim().min(1).max(160),
});

export type ConfigurationRequestIdentityState =
  | 'NOT_CONVERTED'
  | 'UNLINKED'
  | 'SUGGESTED'
  | 'LINKED'
  | 'CONFLICT';

export interface CustomerCandidateSummary {
  id: string;
  displayName: string;
  subjectType: 'PERSON' | 'COMPANY';
  accountType: CustomerAccount['accountType'];
  status: CustomerAccount['status'];
  matchedOn: Array<'EMAIL' | 'PHONE'>;
}

export interface ConfigurationRequestIdentityView {
  requestId: string;
  leadId: string;
  opportunityId?: string;
  state: ConfigurationRequestIdentityState;
  leadCustomerAccountId?: string;
  opportunityCustomerAccountId?: string;
  linkedCustomer?: CustomerCandidateSummary;
  candidates: CustomerCandidateSummary[];
}

function requirePermission(context: RequestContext, permission: string): void {
  if (!context.permissions.has(permission)) {
    throw new DomainError('AUTH.FORBIDDEN', `Missing ${permission} permission.`);
  }
}

function candidateSummary(account: CustomerAccount, matchedOn: Array<'EMAIL' | 'PHONE'>): CustomerCandidateSummary {
  return {
    id: account.id,
    displayName: account.subject.displayName,
    subjectType: account.subject.kind,
    accountType: account.accountType,
    status: account.status,
    matchedOn,
  };
}

function safeNormalizedPhone(value?: string): string | null {
  if (!value?.trim()) return null;
  try {
    return normalizeContactValue('PHONE', value);
  } catch {
    return null;
  }
}

function linkEvent(
  entityType: 'Lead' | 'Opportunity',
  entityId: string,
  customerAccountId: string,
  context: RequestContext,
) {
  return newDomainEvent({
    organizationId: context.organizationId,
    eventType: `CustomerLinkedTo${entityType}`,
    aggregateType: entityType,
    aggregateId: entityId,
    payload: {
      [`${entityType.toLowerCase()}Id`]: entityId,
      customerAccountId,
    },
    correlationId: context.correlationId,
    actor: context.actor,
  });
}

async function appendLinkArtifacts(
  tx: TransactionContext,
  entityType: 'Lead' | 'Opportunity',
  entityId: string,
  customerAccountId: string,
  context: RequestContext,
  events: DomainEventStore,
  audit: AuditStore,
): Promise<void> {
  await events.append(linkEvent(entityType, entityId, customerAccountId, context), tx);
  await audit.append(
    {
      organizationId: context.organizationId,
      actor: context.actor,
      entityType,
      entityId,
      action: 'LINK_CUSTOMER_ACCOUNT',
      afterData: { customerAccountId },
      correlationId: context.correlationId,
    },
    tx,
  );
}

export class ConfigurationRequestIdentityService {
  constructor(
    private readonly requests: ConfigurationRequestReadRepository,
    private readonly customers: CustomerAccountRepository,
    private readonly links: CustomerLinkRepository,
    private readonly leads: LeadRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly uow: UnitOfWork,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  private async getRequest(requestId: string, context: RequestContext): Promise<ConfigurationRequestView> {
    requirePermission(context, 'acquisition.configuration_request.read');
    if (!z.string().uuid().safeParse(requestId).success) {
      throw new DomainError('ACQUISITION.REQUEST_NOT_FOUND', 'Configuration request was not found.');
    }
    const found = await this.requests.findById(context.organizationId, requestId);
    if (!found) throw new DomainError('ACQUISITION.REQUEST_NOT_FOUND', 'Configuration request was not found.');
    return found;
  }

  private requireConversion(request: ConfigurationRequestView) {
    if (!request.conversion) {
      throw new DomainError('ACQUISITION.REQUEST_NOT_CONVERTED', 'Configuration request must be converted first.');
    }
    return request.conversion;
  }

  private async candidatesFor(request: ConfigurationRequestView, context: RequestContext): Promise<CustomerCandidateSummary[]> {
    requirePermission(context, 'customer.account.read');
    const email = normalizeContactValue('EMAIL', request.email);
    const phone = safeNormalizedPhone(request.phone);
    const accounts = await this.customers.listByOrganization(context.organizationId);
    const candidates: CustomerCandidateSummary[] = [];

    for (const account of accounts) {
      const matchedOn: Array<'EMAIL' | 'PHONE'> = [];
      if (account.contacts.some((contact) => contact.contactType === 'EMAIL' && contact.normalizedValue === email)) {
        matchedOn.push('EMAIL');
      }
      if (
        phone &&
        account.contacts.some(
          (contact) =>
            (contact.contactType === 'PHONE' || contact.contactType === 'WHATSAPP') &&
            contact.normalizedValue === phone,
        )
      ) {
        matchedOn.push('PHONE');
      }
      if (matchedOn.length > 0) candidates.push(candidateSummary(account, matchedOn));
    }

    return candidates.sort((a, b) => {
      if (a.matchedOn.length !== b.matchedOn.length) return b.matchedOn.length - a.matchedOn.length;
      return a.displayName.localeCompare(b.displayName, 'pl');
    });
  }

  async read(requestId: string, context: RequestContext): Promise<ConfigurationRequestIdentityView> {
    const request = await this.getRequest(requestId, context);
    const candidates = await this.candidatesFor(request, context);
    const leadCustomerAccountId = await this.links.findForLead(context.organizationId, request.leadId);
    const opportunityCustomerAccountId = request.conversion
      ? await this.links.findForOpportunity(context.organizationId, request.conversion.opportunityId)
      : null;

    let state: ConfigurationRequestIdentityState;
    if (!request.conversion) {
      state = 'NOT_CONVERTED';
    } else if (leadCustomerAccountId && opportunityCustomerAccountId && leadCustomerAccountId === opportunityCustomerAccountId) {
      state = 'LINKED';
    } else if (leadCustomerAccountId || opportunityCustomerAccountId) {
      state = 'CONFLICT';
    } else if (candidates.length > 0) {
      state = 'SUGGESTED';
    } else {
      state = 'UNLINKED';
    }

    const linkedId = state === 'LINKED' ? leadCustomerAccountId : null;
    const linkedAccount = linkedId ? await this.customers.findById(context.organizationId, linkedId) : null;

    return {
      requestId: request.id,
      leadId: request.leadId,
      ...(request.conversion ? { opportunityId: request.conversion.opportunityId } : {}),
      state,
      ...(leadCustomerAccountId ? { leadCustomerAccountId } : {}),
      ...(opportunityCustomerAccountId ? { opportunityCustomerAccountId } : {}),
      ...(linkedAccount ? { linkedCustomer: candidateSummary(linkedAccount, []) } : {}),
      candidates,
    };
  }

  async linkExisting(requestId: string, rawInput: unknown, context: RequestContext): Promise<ConfigurationRequestIdentityView> {
    requirePermission(context, 'customer.account.read');
    requirePermission(context, 'customer.link.write');
    const input = linkExistingSchema.parse(rawInput);
    const request = await this.getRequest(requestId, context);
    const conversion = this.requireConversion(request);
    const account = await this.customers.findById(context.organizationId, input.customerAccountId);
    if (!account) throw new DomainError('CUSTOMER.ACCOUNT_NOT_FOUND', 'Customer account was not found.');

    const [lead, opportunity, leadLinked, opportunityLinked] = await Promise.all([
      this.leads.findById(context.organizationId, request.leadId),
      this.opportunities.findById(context.organizationId, conversion.opportunityId),
      this.links.findForLead(context.organizationId, request.leadId),
      this.links.findForOpportunity(context.organizationId, conversion.opportunityId),
    ]);
    if (!lead) throw new DomainError('CRM.LEAD_NOT_FOUND', 'Lead was not found.');
    if (!opportunity) throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    if ((leadLinked && leadLinked !== account.id) || (opportunityLinked && opportunityLinked !== account.id)) {
      throw new DomainError(
        'CUSTOMER.SALES_CONTEXT_LINK_CONFLICT',
        'Lead or Opportunity is already linked to another customer account.',
      );
    }

    await this.uow.run(async (tx) => {
      const leadChanged = await this.links.bindLead(context.organizationId, request.leadId, account.id, tx);
      const opportunityChanged = await this.links.bindOpportunity(
        context.organizationId,
        conversion.opportunityId,
        account.id,
        tx,
      );
      if (leadChanged) {
        await appendLinkArtifacts(tx, 'Lead', request.leadId, account.id, context, this.events, this.audit);
      }
      if (opportunityChanged) {
        await appendLinkArtifacts(
          tx,
          'Opportunity',
          conversion.opportunityId,
          account.id,
          context,
          this.events,
          this.audit,
        );
      }
    });

    return this.read(requestId, context);
  }

  async createPerson(requestId: string, rawInput: unknown, context: RequestContext): Promise<ConfigurationRequestIdentityView> {
    requirePermission(context, 'customer.account.read');
    requirePermission(context, 'customer.account.write');
    requirePermission(context, 'customer.link.write');
    const input = createPersonSchema.parse(rawInput);
    const request = await this.getRequest(requestId, context);
    const conversion = this.requireConversion(request);

    const [lead, opportunity, leadLinked, opportunityLinked] = await Promise.all([
      this.leads.findById(context.organizationId, request.leadId),
      this.opportunities.findById(context.organizationId, conversion.opportunityId),
      this.links.findForLead(context.organizationId, request.leadId),
      this.links.findForOpportunity(context.organizationId, conversion.opportunityId),
    ]);
    if (!lead) throw new DomainError('CRM.LEAD_NOT_FOUND', 'Lead was not found.');
    if (!opportunity) throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    if (leadLinked || opportunityLinked) {
      throw new DomainError(
        'CUSTOMER.SALES_CONTEXT_LINK_CONFLICT',
        'Lead or Opportunity already has a customer account; choose the existing identity instead.',
      );
    }

    const now = new Date();
    const personId = randomUUID();
    const accountId = randomUUID();
    const emailNormalized = normalizeContactValue('EMAIL', request.email);
    const contacts: ContactPoint[] = [
      {
        id: randomUUID(),
        organizationId: context.organizationId,
        customerAccountId: accountId,
        contactType: 'EMAIL',
        value: request.email.trim(),
        normalizedValue: emailNormalized,
        isPrimary: true,
        createdAt: now,
      },
    ];
    const normalizedPhone = safeNormalizedPhone(request.phone);
    if (request.phone?.trim() && normalizedPhone) {
      contacts.push({
        id: randomUUID(),
        organizationId: context.organizationId,
        customerAccountId: accountId,
        contactType: 'PHONE',
        value: request.phone.trim(),
        normalizedValue: normalizedPhone,
        isPrimary: true,
        createdAt: now,
      });
    }

    const person = {
      id: personId,
      organizationId: context.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const account = {
      id: accountId,
      organizationId: context.organizationId,
      accountType: 'B2C' as const,
      status: 'PROSPECT' as const,
      personId,
      preferredLanguage: 'pl',
      createdAt: now,
      updatedAt: now,
    };
    const customerEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'CustomerAccountCreated',
      aggregateType: 'CustomerAccount',
      aggregateId: accountId,
      payload: {
        customerAccountId: accountId,
        subjectType: 'PERSON',
        accountType: account.accountType,
        status: account.status,
        contactTypes: contacts.map((contact) => contact.contactType),
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.customers.insertPersonAccount(person, account, contacts, tx);
      const leadChanged = await this.links.bindLead(context.organizationId, request.leadId, accountId, tx);
      const opportunityChanged = await this.links.bindOpportunity(
        context.organizationId,
        conversion.opportunityId,
        accountId,
        tx,
      );
      if (!leadChanged || !opportunityChanged) {
        throw new DomainError(
          'CUSTOMER.SALES_CONTEXT_LINK_CONFLICT',
          'Lead or Opportunity was linked concurrently; customer creation was rolled back.',
        );
      }
      await this.events.append(customerEvent, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'CustomerAccount',
          entityId: accountId,
          action: 'CREATE',
          afterData: {
            subjectType: 'PERSON',
            accountType: account.accountType,
            status: account.status,
            contactTypes: contacts.map((contact) => contact.contactType),
          },
          correlationId: context.correlationId,
        },
        tx,
      );
      await appendLinkArtifacts(tx, 'Lead', request.leadId, accountId, context, this.events, this.audit);
      await appendLinkArtifacts(
        tx,
        'Opportunity',
        conversion.opportunityId,
        accountId,
        context,
        this.events,
        this.audit,
      );
    });

    return this.read(requestId, context);
  }
}
