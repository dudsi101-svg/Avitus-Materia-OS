import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { leads, opportunities, organizations } from './schema';

export const customerAccountType = pgEnum('customer_account_type', [
  'B2C',
  'B2B',
  'ARCHITECT',
  'PARTNER',
  'DEALER',
  'OTHER',
]);
export const customerAccountStatus = pgEnum('customer_account_status', [
  'PROSPECT',
  'ACTIVE',
  'VIP',
  'DORMANT',
  'AT_RISK',
  'BLOCKED',
  'ARCHIVED',
]);
export const contactPointType = pgEnum('contact_point_type', ['EMAIL', 'PHONE', 'WHATSAPP', 'OTHER']);

export const persons = pgTable(
  'persons',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    firstName: varchar('first_name', { length: 160 }).notNull(),
    lastName: varchar('last_name', { length: 160 }).notNull(),
    displayName: varchar('display_name', { length: 340 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('persons_org_name_idx').on(table.organizationId, table.lastName, table.firstName)],
);

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    legalName: varchar('legal_name', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 320 }).notNull(),
    taxId: varchar('tax_id', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('companies_org_name_idx').on(table.organizationId, table.displayName),
    index('companies_org_tax_id_idx').on(table.organizationId, table.taxId),
  ],
);

export const customerAccounts = pgTable(
  'customer_accounts',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    accountType: customerAccountType('account_type').notNull(),
    status: customerAccountStatus('status').notNull().default('PROSPECT'),
    personId: uuid('person_id').references(() => persons.id, { onDelete: 'restrict' }),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'restrict' }),
    preferredLanguage: varchar('preferred_language', { length: 12 }).notNull().default('pl'),
    internalNote: text('internal_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('customer_accounts_person_uidx').on(table.personId),
    uniqueIndex('customer_accounts_company_uidx').on(table.companyId),
    index('customer_accounts_org_status_idx').on(table.organizationId, table.status),
  ],
);

export const contactPoints = pgTable(
  'contact_points',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    customerAccountId: uuid('customer_account_id')
      .notNull()
      .references(() => customerAccounts.id, { onDelete: 'cascade' }),
    contactType: contactPointType('contact_type').notNull(),
    value: varchar('value', { length: 500 }).notNull(),
    normalizedValue: varchar('normalized_value', { length: 500 }).notNull(),
    label: varchar('label', { length: 120 }),
    isPrimary: boolean('is_primary').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('contact_points_account_type_value_uidx').on(
      table.customerAccountId,
      table.contactType,
      table.normalizedValue,
    ),
    index('contact_points_org_lookup_idx').on(table.organizationId, table.contactType, table.normalizedValue),
  ],
);

export const leadCustomerAccounts = pgTable(
  'lead_customer_accounts',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .primaryKey()
      .references(() => leads.id, { onDelete: 'cascade' }),
    customerAccountId: uuid('customer_account_id')
      .notNull()
      .references(() => customerAccounts.id, { onDelete: 'restrict' }),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('lead_customer_accounts_org_account_idx').on(table.organizationId, table.customerAccountId)],
);

export const opportunityCustomerAccounts = pgTable(
  'opportunity_customer_accounts',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id')
      .primaryKey()
      .references(() => opportunities.id, { onDelete: 'cascade' }),
    customerAccountId: uuid('customer_account_id')
      .notNull()
      .references(() => customerAccounts.id, { onDelete: 'restrict' }),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('opportunity_customer_accounts_org_account_idx').on(table.organizationId, table.customerAccountId),
  ],
);
