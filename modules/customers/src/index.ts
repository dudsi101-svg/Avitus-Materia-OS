import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { LeadRepository, OpportunityRepository } from '@avitus/crm';
import {
  companies,
  contactPoints,
  customerAccounts,
  executorFrom,
  leadCustomerAccounts,
  opportunityCustomerAccounts,
  persons,
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
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

export type CustomerAccountType = 'B2C' | 'B2B' | 'ARCHITECT' | 'PARTNER' | 'DEALER' | 'OTHER';
export type CustomerAccountStatus = 'PROSPECT' | 'ACTIVE' | 'VIP' | 'DORMANT' | 'AT_RISK' | 'BLOCKED' | 'ARCHIVED';
export type ContactPointType = 'EMAIL' | 'PHONE' | 'WHATSAPP' | 'OTHER';

export interface PersonSubject {
  kind: 'PERSON';
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface CompanySubject {
  kind: 'COMPANY';
  id: string;
  legalName: string;
  displayName: string;
  taxId?: string;
}

export interface ContactPoint {
  id: string;
  organizationId: string;
  customerAccountId: string;
  contactType: ContactPointType;
  value: string;
  normalizedValue: string;
  label?: string;
  isPrimary: boolean;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface CustomerAccount {
  id: string;
  organizationId: string;
  accountType: CustomerAccountType;
  status: CustomerAccountStatus;
  preferredLanguage: string;
  internalNote?: string;
  subject: PersonSubject | CompanySubject;
  contacts: ContactPoint[];
  createdAt: Date;
  updatedAt: Date;
}

interface PersistedPerson {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PersistedCompany {
  id: string;
  organizationId: string;
  legalName: string;
  displayName: string;
  taxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PersistedAccount {
  id: string;
  organizationId: string;
  accountType: CustomerAccountType;
  status: CustomerAccountStatus;
  personId?: string;
  companyId?: string;
  preferredLanguage: string;
  internalNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerAccountRepository {
  insertPersonAccount(
    person: PersistedPerson,
    account: PersistedAccount,
    contacts: ContactPoint[],
    tx?: TransactionContext,
  ): Promise<void>;
  insertCompanyAccount(
    company: PersistedCompany,
    account: PersistedAccount,
    contacts: ContactPoint[],
    tx?: TransactionContext,
  ): Promise<void>;
  findById(organizationId: string, customerAccountId: string): Promise<CustomerAccount | null>;
  listByOrganization(organizationId: string): Promise<CustomerAccount[]>;
}

export interface CustomerLinkRepository {
  bindLead(
    organizationId: string,
    leadId: string,
    customerAccountId: string,
    tx?: TransactionContext,
  ): Promise<boolean>;
  bindOpportunity(
    organizationId: string,
    opportunityId: string,
    customerAccountId: string,
    tx?: TransactionContext,
  ): Promise<boolean>;
  findForLead(organizationId: string, leadId: string): Promise<string | null>;
  findForOpportunity(organizationId: string, opportunityId: string): Promise<string | null>;
}

function contactFromRow(row: typeof contactPoints.$inferSelect): ContactPoint {
  return {
    id: row.id,
    organizationId: row.organizationId,
    customerAccountId: row.customerAccountId,
    contactType: row.contactType,
    value: row.value,
    normalizedValue: row.normalizedValue,
    ...(row.label ? { label: row.label } : {}),
    isPrimary: row.isPrimary,
    ...(row.verifiedAt ? { verifiedAt: row.verifiedAt } : {}),
    createdAt: row.createdAt,
  };
}

export class PostgresCustomerAccountRepository implements CustomerAccountRepository {
  constructor(private readonly db: DbExecutor) {}

  async insertPersonAccount(
    person: PersistedPerson,
    account: PersistedAccount,
    contacts: ContactPoint[],
    tx?: TransactionContext,
  ): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(persons).values({
      id: person.id,
      organizationId: person.organizationId,
      firstName: person.firstName,
      lastName: person.lastName,
      displayName: person.displayName,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });
    await executor.insert(customerAccounts).values({
      id: account.id,
      organizationId: account.organizationId,
      accountType: account.accountType,
      status: account.status,
      personId: person.id,
      preferredLanguage: account.preferredLanguage,
      internalNote: account.internalNote,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
    await this.insertContacts(contacts, executor);
  }

  async insertCompanyAccount(
    company: PersistedCompany,
    account: PersistedAccount,
    contacts: ContactPoint[],
    tx?: TransactionContext,
  ): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(companies).values({
      id: company.id,
      organizationId: company.organizationId,
      legalName: company.legalName,
      displayName: company.displayName,
      taxId: company.taxId,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    });
    await executor.insert(customerAccounts).values({
      id: account.id,
      organizationId: account.organizationId,
      accountType: account.accountType,
      status: account.status,
      companyId: company.id,
      preferredLanguage: account.preferredLanguage,
      internalNote: account.internalNote,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    });
    await this.insertContacts(contacts, executor);
  }

  private async insertContacts(contacts: ContactPoint[], executor: DbExecutor): Promise<void> {
    if (contacts.length === 0) return;
    await executor.insert(contactPoints).values(
      contacts.map((contact) => ({
        id: contact.id,
        organizationId: contact.organizationId,
        customerAccountId: contact.customerAccountId,
        contactType: contact.contactType,
        value: contact.value,
        normalizedValue: contact.normalizedValue,
        label: contact.label,
        isPrimary: contact.isPrimary,
        verifiedAt: contact.verifiedAt,
        createdAt: contact.createdAt,
      })),
    );
  }

  async findById(organizationId: string, customerAccountId: string): Promise<CustomerAccount | null> {
    const accountRows = await this.db
      .select()
      .from(customerAccounts)
      .where(
        and(
          eq(customerAccounts.organizationId, organizationId),
          eq(customerAccounts.id, customerAccountId),
        ),
      )
      .limit(1);
    const row = accountRows[0];
    if (!row) return null;

    const contactRows = await this.db
      .select()
      .from(contactPoints)
      .where(
        and(
          eq(contactPoints.organizationId, organizationId),
          eq(contactPoints.customerAccountId, customerAccountId),
        ),
      )
      .orderBy(desc(contactPoints.isPrimary), contactPoints.createdAt);

    let subject: PersonSubject | CompanySubject;
    if (row.personId) {
      const personRows = await this.db
        .select()
        .from(persons)
        .where(and(eq(persons.organizationId, organizationId), eq(persons.id, row.personId)))
        .limit(1);
      const person = personRows[0];
      if (!person) throw new DomainError('CUSTOMER.SUBJECT_INTEGRITY', 'Customer person subject is missing.');
      subject = {
        kind: 'PERSON',
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        displayName: person.displayName,
      };
    } else if (row.companyId) {
      const companyRows = await this.db
        .select()
        .from(companies)
        .where(and(eq(companies.organizationId, organizationId), eq(companies.id, row.companyId)))
        .limit(1);
      const company = companyRows[0];
      if (!company) throw new DomainError('CUSTOMER.SUBJECT_INTEGRITY', 'Customer company subject is missing.');
      subject = {
        kind: 'COMPANY',
        id: company.id,
        legalName: company.legalName,
        displayName: company.displayName,
        ...(company.taxId ? { taxId: company.taxId } : {}),
      };
    } else {
      throw new DomainError('CUSTOMER.SUBJECT_INTEGRITY', 'Customer account has no subject.');
    }

    return {
      id: row.id,
      organizationId: row.organizationId,
      accountType: row.accountType,
      status: row.status,
      preferredLanguage: row.preferredLanguage,
      ...(row.internalNote ? { internalNote: row.internalNote } : {}),
      subject,
      contacts: contactRows.map(contactFromRow),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listByOrganization(organizationId: string): Promise<CustomerAccount[]> {
    const rows = await this.db
      .select({ id: customerAccounts.id })
      .from(customerAccounts)
      .where(eq(customerAccounts.organizationId, organizationId))
      .orderBy(desc(customerAccounts.createdAt));
    const accounts = await Promise.all(rows.map((row) => this.findById(organizationId, row.id)));
    return accounts.filter((account): account is CustomerAccount => account !== null);
  }
}

export class PostgresCustomerLinkRepository implements CustomerLinkRepository {
  constructor(private readonly db: DbExecutor) {}

  async bindLead(
    organizationId: string,
    leadId: string,
    customerAccountId: string,
    tx?: TransactionContext,
  ): Promise<boolean> {
    const executor = executorFrom(tx, this.db);
    const existing = await executor
      .select({ customerAccountId: leadCustomerAccounts.customerAccountId })
      .from(leadCustomerAccounts)
      .where(
        and(
          eq(leadCustomerAccounts.organizationId, organizationId),
          eq(leadCustomerAccounts.leadId, leadId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      if (existing[0].customerAccountId === customerAccountId) return false;
      throw new DomainError('CUSTOMER.LEAD_ALREADY_LINKED', 'Lead is already linked to another customer account.');
    }
    await executor.insert(leadCustomerAccounts).values({ organizationId, leadId, customerAccountId });
    return true;
  }

  async bindOpportunity(
    organizationId: string,
    opportunityId: string,
    customerAccountId: string,
    tx?: TransactionContext,
  ): Promise<boolean> {
    const executor = executorFrom(tx, this.db);
    const existing = await executor
      .select({ customerAccountId: opportunityCustomerAccounts.customerAccountId })
      .from(opportunityCustomerAccounts)
      .where(
        and(
          eq(opportunityCustomerAccounts.organizationId, organizationId),
          eq(opportunityCustomerAccounts.opportunityId, opportunityId),
        ),
      )
      .limit(1);
    if (existing[0]) {
      if (existing[0].customerAccountId === customerAccountId) return false;
      throw new DomainError(
        'CUSTOMER.OPPORTUNITY_ALREADY_LINKED',
        'Opportunity is already linked to another customer account.',
      );
    }
    await executor.insert(opportunityCustomerAccounts).values({
      organizationId,
      opportunityId,
      customerAccountId,
    });
    return true;
  }

  async findForLead(organizationId: string, leadId: string): Promise<string | null> {
    const rows = await this.db
      .select({ customerAccountId: leadCustomerAccounts.customerAccountId })
      .from(leadCustomerAccounts)
      .where(
        and(
          eq(leadCustomerAccounts.organizationId, organizationId),
          eq(leadCustomerAccounts.leadId, leadId),
        ),
      )
      .limit(1);
    return rows[0]?.customerAccountId ?? null;
  }

  async findForOpportunity(organizationId: string, opportunityId: string): Promise<string | null> {
    const rows = await this.db
      .select({ customerAccountId: opportunityCustomerAccounts.customerAccountId })
      .from(opportunityCustomerAccounts)
      .where(
        and(
          eq(opportunityCustomerAccounts.organizationId, organizationId),
          eq(opportunityCustomerAccounts.opportunityId, opportunityId),
        ),
      )
      .limit(1);
    return rows[0]?.customerAccountId ?? null;
  }
}

const accountTypeSchema = z.enum(['B2C', 'B2B', 'ARCHITECT', 'PARTNER', 'DEALER', 'OTHER']);
const contactSchema = z.object({
  contactType: z.enum(['EMAIL', 'PHONE', 'WHATSAPP', 'OTHER']),
  value: z.string().trim().min(1).max(500),
  label: z.string().trim().min(1).max(120).optional(),
  isPrimary: z.boolean().optional().default(false),
});

export const createPersonAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(160),
  lastName: z.string().trim().min(1).max(160),
  accountType: accountTypeSchema.default('B2C'),
  preferredLanguage: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default('pl'),
  internalNote: z.string().trim().max(5000).optional(),
  contacts: z.array(contactSchema).min(1).max(10),
});

export const createCompanyAccountSchema = z.object({
  legalName: z.string().trim().min(1).max(320),
  displayName: z.string().trim().min(1).max(320).optional(),
  taxId: z.string().trim().min(3).max(80).optional(),
  accountType: accountTypeSchema.default('B2B'),
  preferredLanguage: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default('pl'),
  internalNote: z.string().trim().max(5000).optional(),
  contacts: z.array(contactSchema).min(1).max(10),
});

function normalizePhone(value: string): string {
  let normalized = value.trim().replace(/[\s().-]/g, '');
  if (normalized.startsWith('00')) normalized = `+${normalized.slice(2)}`;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new DomainError(
      'CUSTOMER.INVALID_PHONE',
      'Phone/WhatsApp contact must use an international number such as +48123456789.',
    );
  }
  return normalized;
}

export function normalizeContactValue(type: ContactPointType, value: string): string {
  if (type === 'EMAIL') {
    const parsed = z.string().email().safeParse(value.trim().toLowerCase());
    if (!parsed.success) throw new DomainError('CUSTOMER.INVALID_EMAIL', 'Email contact is invalid.');
    return parsed.data;
  }
  if (type === 'PHONE' || type === 'WHATSAPP') return normalizePhone(value);
  return value.trim().toLowerCase();
}

function buildContacts(
  organizationId: string,
  customerAccountId: string,
  rawContacts: z.infer<typeof contactSchema>[],
  now: Date,
): ContactPoint[] {
  const normalized = rawContacts.map((contact) => ({
    ...contact,
    normalizedValue: normalizeContactValue(contact.contactType, contact.value),
  }));
  const seen = new Set<string>();
  for (const contact of normalized) {
    const key = `${contact.contactType}:${contact.normalizedValue}`;
    if (seen.has(key)) throw new DomainError('CUSTOMER.DUPLICATE_CONTACT', 'Duplicate contact point in request.');
    seen.add(key);
  }

  const primaryCounts = new Map<ContactPointType, number>();
  for (const contact of normalized) {
    if (!contact.isPrimary) continue;
    primaryCounts.set(contact.contactType, (primaryCounts.get(contact.contactType) ?? 0) + 1);
  }
  for (const [type, count] of primaryCounts) {
    if (count > 1) {
      throw new DomainError(
        'CUSTOMER.MULTIPLE_PRIMARY_CONTACTS',
        `Only one primary ${type} contact is allowed per customer account.`,
      );
    }
  }

  const hasPrimary = new Set(
    normalized.filter((contact) => contact.isPrimary).map((contact) => contact.contactType),
  );
  const autoPrimaryUsed = new Set<ContactPointType>();
  return normalized.map((contact) => {
    const makePrimary =
      contact.isPrimary ||
      (!hasPrimary.has(contact.contactType) && !autoPrimaryUsed.has(contact.contactType));
    if (makePrimary && !hasPrimary.has(contact.contactType)) autoPrimaryUsed.add(contact.contactType);
    return {
      id: randomUUID(),
      organizationId,
      customerAccountId,
      contactType: contact.contactType,
      value: contact.value.trim(),
      normalizedValue: contact.normalizedValue,
      ...(contact.label ? { label: contact.label } : {}),
      isPrimary: makePrimary,
      createdAt: now,
    };
  });
}

export class CreatePersonCustomerService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly customers: CustomerAccountRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<CustomerAccount> {
    if (!context.permissions.has('customer.account.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.account.write permission.');
    }
    const input = createPersonAccountSchema.parse(rawInput);
    const now = new Date();
    const personId = randomUUID();
    const accountId = randomUUID();
    const person: PersistedPerson = {
      id: personId,
      organizationId: context.organizationId,
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      createdAt: now,
      updatedAt: now,
    };
    const account: PersistedAccount = {
      id: accountId,
      organizationId: context.organizationId,
      accountType: input.accountType,
      status: 'PROSPECT',
      personId,
      preferredLanguage: input.preferredLanguage,
      ...(input.internalNote ? { internalNote: input.internalNote } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const contacts = buildContacts(context.organizationId, accountId, input.contacts, now);
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'CustomerAccountCreated',
      aggregateType: 'CustomerAccount',
      aggregateId: accountId,
      payload: {
        customerAccountId: accountId,
        subjectType: 'PERSON',
        accountType: input.accountType,
        status: account.status,
        contactTypes: contacts.map((contact) => contact.contactType),
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.customers.insertPersonAccount(person, account, contacts, tx);
      await this.events.append(event, tx);
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
    });
    const created = await this.customers.findById(context.organizationId, accountId);
    if (!created) throw new DomainError('CUSTOMER.CREATE_FAILED', 'Customer account could not be reloaded.');
    return created;
  }
}

export class CreateCompanyCustomerService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly customers: CustomerAccountRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<CustomerAccount> {
    if (!context.permissions.has('customer.account.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.account.write permission.');
    }
    const input = createCompanyAccountSchema.parse(rawInput);
    const now = new Date();
    const companyId = randomUUID();
    const accountId = randomUUID();
    const company: PersistedCompany = {
      id: companyId,
      organizationId: context.organizationId,
      legalName: input.legalName,
      displayName: input.displayName ?? input.legalName,
      ...(input.taxId ? { taxId: input.taxId } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const account: PersistedAccount = {
      id: accountId,
      organizationId: context.organizationId,
      accountType: input.accountType,
      status: 'PROSPECT',
      companyId,
      preferredLanguage: input.preferredLanguage,
      ...(input.internalNote ? { internalNote: input.internalNote } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const contacts = buildContacts(context.organizationId, accountId, input.contacts, now);
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'CustomerAccountCreated',
      aggregateType: 'CustomerAccount',
      aggregateId: accountId,
      payload: {
        customerAccountId: accountId,
        subjectType: 'COMPANY',
        accountType: input.accountType,
        status: account.status,
        contactTypes: contacts.map((contact) => contact.contactType),
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.customers.insertCompanyAccount(company, account, contacts, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'CustomerAccount',
          entityId: accountId,
          action: 'CREATE',
          afterData: {
            subjectType: 'COMPANY',
            accountType: account.accountType,
            status: account.status,
            contactTypes: contacts.map((contact) => contact.contactType),
          },
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    const created = await this.customers.findById(context.organizationId, accountId);
    if (!created) throw new DomainError('CUSTOMER.CREATE_FAILED', 'Customer account could not be reloaded.');
    return created;
  }
}

export class ReadCustomerService {
  constructor(private readonly customers: CustomerAccountRepository) {}

  async list(context: RequestContext): Promise<CustomerAccount[]> {
    if (!context.permissions.has('customer.account.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.account.read permission.');
    }
    return this.customers.listByOrganization(context.organizationId);
  }

  async byId(customerAccountId: string, context: RequestContext): Promise<CustomerAccount> {
    if (!context.permissions.has('customer.account.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.account.read permission.');
    }
    const account = await this.customers.findById(context.organizationId, customerAccountId);
    if (!account) throw new DomainError('CUSTOMER.ACCOUNT_NOT_FOUND', 'Customer account was not found.');
    return account;
  }
}

export class LinkCustomerService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly customers: CustomerAccountRepository,
    private readonly links: CustomerLinkRepository,
    private readonly leads: LeadRepository,
    private readonly opportunities: OpportunityRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async toLead(customerAccountId: string, leadId: string, context: RequestContext): Promise<CustomerAccount> {
    return this.link('Lead', customerAccountId, leadId, context);
  }

  async toOpportunity(
    customerAccountId: string,
    opportunityId: string,
    context: RequestContext,
  ): Promise<CustomerAccount> {
    return this.link('Opportunity', customerAccountId, opportunityId, context);
  }

  private async link(
    entityType: 'Lead' | 'Opportunity',
    customerAccountId: string,
    entityId: string,
    context: RequestContext,
  ): Promise<CustomerAccount> {
    if (!context.permissions.has('customer.link.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.link.write permission.');
    }
    const account = await this.customers.findById(context.organizationId, customerAccountId);
    if (!account) throw new DomainError('CUSTOMER.ACCOUNT_NOT_FOUND', 'Customer account was not found.');

    if (entityType === 'Lead') {
      const lead = await this.leads.findById(context.organizationId, entityId);
      if (!lead) throw new DomainError('CRM.LEAD_NOT_FOUND', 'Lead was not found.');
    } else {
      const opportunity = await this.opportunities.findById(context.organizationId, entityId);
      if (!opportunity) throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    }

    const event = newDomainEvent({
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

    let changed = false;
    await this.uow.run(async (tx) => {
      changed =
        entityType === 'Lead'
          ? await this.links.bindLead(context.organizationId, entityId, customerAccountId, tx)
          : await this.links.bindOpportunity(context.organizationId, entityId, customerAccountId, tx);
      if (!changed) return;
      await this.events.append(event, tx);
      await this.audit.append(
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
    });
    return account;
  }
}

export class CustomerContextService {
  constructor(
    private readonly customers: CustomerAccountRepository,
    private readonly links: CustomerLinkRepository,
  ) {}

  async forLead(leadId: string, context: RequestContext): Promise<CustomerAccount | null> {
    if (!context.permissions.has('customer.account.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.account.read permission.');
    }
    const accountId = await this.links.findForLead(context.organizationId, leadId);
    return accountId ? this.customers.findById(context.organizationId, accountId) : null;
  }

  async forOpportunity(opportunityId: string, context: RequestContext): Promise<CustomerAccount | null> {
    if (!context.permissions.has('customer.account.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing customer.account.read permission.');
    }
    const accountId = await this.links.findForOpportunity(context.organizationId, opportunityId);
    return accountId ? this.customers.findById(context.organizationId, accountId) : null;
  }
}
