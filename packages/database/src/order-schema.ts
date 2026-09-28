import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { configurations, opportunities, organizations, quotes } from './schema';
import { customerAccounts } from './customer-schema';

export const orderStatus = pgEnum('order_status', ['CONFIRMED', 'ON_HOLD', 'CANCELLED', 'COMPLETED']);
export const projectStatus = pgEnum('project_status', ['PLANNING', 'READY', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);

export const quoteAcceptances = pgTable(
  'quote_acceptances',
  {
    quoteId: uuid('quote_id')
      .primaryKey()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    quoteVersionNumber: integer('quote_version_number').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
    acceptedByActorType: varchar('accepted_by_actor_type', { length: 40 }).notNull(),
    acceptedByActorId: uuid('accepted_by_actor_id').notNull(),
  },
  (table) => [index('quote_acceptances_org_idx').on(table.organizationId, table.acceptedAt)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderNumber: varchar('order_number', { length: 80 }).notNull(),
    quoteId: uuid('quote_id')
      .notNull()
      .references(() => quotes.id, { onDelete: 'restrict' }),
    quoteVersionNumber: integer('quote_version_number').notNull(),
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'restrict' }),
    customerAccountId: uuid('customer_account_id')
      .notNull()
      .references(() => customerAccounts.id, { onDelete: 'restrict' }),
    configurationId: uuid('configuration_id')
      .notNull()
      .references(() => configurations.id, { onDelete: 'restrict' }),
    currency: varchar('currency', { length: 3 }).notNull(),
    subtotal: numeric('subtotal', { precision: 19, scale: 4 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 19, scale: 4 }).notNull(),
    taxAmount: numeric('tax_amount', { precision: 19, scale: 4 }).notNull(),
    total: numeric('total', { precision: 19, scale: 4 }).notNull(),
    estimatedCost: numeric('estimated_cost', { precision: 19, scale: 4 }).notNull(),
    marginAmount: numeric('margin_amount', { precision: 19, scale: 4 }).notNull(),
    marginBps: integer('margin_bps').notNull(),
    buyerSnapshot: jsonb('buyer_snapshot').notNull(),
    status: orderStatus('status').notNull().default('CONFIRMED'),
    createdByUserId: uuid('created_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('orders_org_number_uidx').on(table.organizationId, table.orderNumber),
    uniqueIndex('orders_org_quote_uidx').on(table.organizationId, table.quoteId),
    index('orders_org_customer_idx').on(table.organizationId, table.customerAccountId),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    configurationId: uuid('configuration_id')
      .notNull()
      .references(() => configurations.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    status: projectStatus('status').notNull().default('PLANNING'),
    ownerUserId: uuid('owner_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('projects_org_order_uidx').on(table.organizationId, table.orderId),
    index('projects_org_status_idx').on(table.organizationId, table.status),
  ],
);
