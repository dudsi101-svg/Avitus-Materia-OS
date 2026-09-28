import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { configurations, leads, opportunities, organizations, products } from './schema';

export const publicInquirySubmissions = pgTable('public_inquiry_submissions', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  projectType: varchar('project_type', { length: 80 }).notNull(),
  message: text('message').notNull(),
  source: varchar('source', { length: 120 }).notNull().default('PUBLIC_WEB'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('public_inquiry_submissions_org_created_idx').on(table.organizationId, table.createdAt),
  index('public_inquiry_submissions_lead_idx').on(table.leadId),
]);

export const publicConfigurationRequests = pgTable('public_configuration_requests', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  productSku: varchar('product_sku', { length: 120 }).notNull(),
  productName: varchar('product_name', { length: 255 }).notNull(),
  optionValues: jsonb('option_values').notNull(),
  configurationStatus: varchar('configuration_status', { length: 40 }).notNull(),
  readinessIssues: jsonb('readiness_issues').notNull().default([]),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  phone: varchar('phone', { length: 40 }),
  message: text('message'),
  source: varchar('source', { length: 120 }).notNull().default('PUBLIC_CONFIGURATOR'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('public_configuration_requests_org_created_idx').on(table.organizationId, table.createdAt),
  index('public_configuration_requests_lead_idx').on(table.leadId),
]);

export const publicConfigurationRequestConversions = pgTable('public_configuration_request_conversions', {
  requestId: uuid('request_id').primaryKey().references(() => publicConfigurationRequests.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id),
  configurationId: uuid('configuration_id').notNull().references(() => configurations.id),
  convertedByActorType: varchar('converted_by_actor_type', { length: 40 }).notNull(),
  convertedByActorId: uuid('converted_by_actor_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('public_configuration_request_conversions_org_idx').on(table.organizationId, table.createdAt),
]);
