import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const organizationStatus = pgEnum('organization_status', ['ACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const userStatus = pgEnum('user_status', ['ACTIVE', 'SUSPENDED', 'ARCHIVED']);
export const membershipStatus = pgEnum('membership_status', ['ACTIVE', 'SUSPENDED']);
export const leadStatus = pgEnum('lead_status', [
  'NEW', 'CONTACT_PENDING', 'CONTACTED', 'QUALIFYING', 'QUALIFIED', 'DISCOVERY',
  'CONFIGURING', 'QUOTE_PENDING', 'QUOTED', 'NEGOTIATION', 'WON', 'LOST', 'DORMANT', 'DISQUALIFIED',
]);
export const leadPriority = pgEnum('lead_priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const opportunityStatus = pgEnum('opportunity_status', [
  'OPEN', 'DISCOVERY', 'SOLUTION_DEFINED', 'PRICING', 'PROPOSAL_SENT', 'NEGOTIATION', 'COMMIT', 'WON', 'LOST', 'ON_HOLD',
]);
export const productType = pgEnum('product_type', ['STANDARD', 'CONFIGURABLE', 'CUSTOM', 'SERVICE']);
export const optionDataType = pgEnum('product_option_data_type', ['NUMBER', 'TEXT', 'ENUM', 'BOOLEAN']);
export const configurationStatus = pgEnum('configuration_status', [
  'DRAFT', 'INCOMPLETE', 'READY_FOR_PRICING', 'PRICED', 'CUSTOMER_REVIEW', 'APPROVED', 'LOCKED', 'SUPERSEDED', 'ARCHIVED',
]);
export const costComponentType = pgEnum('cost_component_type', [
  'MATERIAL', 'LABOR', 'MACHINE', 'OUTSOURCING', 'TRANSPORT', 'PACKAGING', 'FINISH', 'OTHER',
]);
export const quoteStatus = pgEnum('quote_status', [
  'DRAFT', 'INTERNAL_REVIEW', 'READY', 'SENT', 'VIEWED', 'NEGOTIATION', 'ACCEPTED', 'DECLINED',
  'EXPIRED', 'WITHDRAWN', 'REVISION_REQUIRED', 'SUPERSEDED',
]);
export const actorType = pgEnum('actor_type', ['USER', 'AI_AGENT', 'SYSTEM', 'INTEGRATION', 'CUSTOMER', 'PARTNER']);
export const outboxStatus = pgEnum('outbox_status', ['PENDING', 'PUBLISHED', 'FAILED']);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 120 }).notNull(),
  status: organizationStatus('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('organizations_slug_uidx').on(table.slug)]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  authProviderId: varchar('auth_provider_id', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }).notNull(),
  status: userStatus('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('users_auth_provider_uidx').on(table.authProviderId)]);

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 120 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey(),
  code: varchar('code', { length: 160 }).notNull().unique(),
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })]);

export const organizationUsers = pgTable('organization_users', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  status: membershipStatus('status').notNull().default('ACTIVE'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('organization_users_org_user_uidx').on(table.organizationId, table.userId)]);

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  source: varchar('source', { length: 120 }),
  status: leadStatus('status').notNull().default('NEW'),
  priority: leadPriority('priority').notNull().default('NORMAL'),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('leads_org_created_idx').on(table.organizationId, table.createdAt),
  index('leads_org_status_idx').on(table.organizationId, table.status),
]);

export const opportunities = pgTable('opportunities', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: opportunityStatus('status').notNull().default('OPEN'),
  estimatedValue: numeric('estimated_value', { precision: 19, scale: 4 }),
  currency: varchar('currency', { length: 3 }).notNull().default('PLN'),
  probability: integer('probability').notNull().default(25),
  expectedCloseDate: date('expected_close_date'),
  wonAt: timestamp('won_at', { withTimezone: true }),
  lostAt: timestamp('lost_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('opportunities_org_status_idx').on(table.organizationId, table.status),
  index('opportunities_org_lead_idx').on(table.organizationId, table.leadId),
]);

export const productFamilies = pgTable('product_families', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 160 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('product_families_org_slug_uidx').on(table.organizationId, table.slug)]);

export const products = pgTable('products', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  productFamilyId: uuid('product_family_id').notNull().references(() => productFamilies.id),
  sku: varchar('sku', { length: 120 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 160 }).notNull(),
  description: text('description'),
  productType: productType('product_type').notNull(),
  active: boolean('active').notNull().default(true),
  basePrice: numeric('base_price', { precision: 19, scale: 4 }),
  defaultCurrency: varchar('default_currency', { length: 3 }).notNull().default('PLN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('products_org_sku_uidx').on(table.organizationId, table.sku),
  uniqueIndex('products_org_slug_uidx').on(table.organizationId, table.slug),
]);

export const productOptionDefinitions = pgTable('product_option_definitions', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 120 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  dataType: optionDataType('data_type').notNull(),
  required: boolean('required').notNull().default(false),
  minValue: numeric('min_value', { precision: 19, scale: 4 }),
  maxValue: numeric('max_value', { precision: 19, scale: 4 }),
  unit: varchar('unit', { length: 40 }),
  choices: jsonb('choices'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('product_option_product_code_uidx').on(table.productId, table.code)]);

export const configurations = pgTable('configurations', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  status: configurationStatus('status').notNull().default('DRAFT'),
  currentVersion: integer('current_version').notNull().default(1),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdByAi: boolean('created_by_ai').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('configurations_org_opportunity_idx').on(table.organizationId, table.opportunityId),
  index('configurations_org_status_idx').on(table.organizationId, table.status),
]);

export const configurationVersions = pgTable('configuration_versions', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  configurationId: uuid('configuration_id').notNull().references(() => configurations.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  configurationData: jsonb('configuration_data').notNull(),
  readinessIssues: jsonb('readiness_issues').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdByAi: boolean('created_by_ai').notNull().default(false),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('configuration_versions_number_uidx').on(table.configurationId, table.versionNumber),
  index('configuration_versions_org_config_idx').on(table.organizationId, table.configurationId),
]);

export const priceCalculations = pgTable('price_calculations', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  configurationId: uuid('configuration_id').notNull().references(() => configurations.id),
  configurationVersionId: uuid('configuration_version_id').notNull().references(() => configurationVersions.id),
  configurationVersionNumber: integer('configuration_version_number').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  algorithmVersion: varchar('algorithm_version', { length: 120 }).notNull(),
  targetMarginBps: integer('target_margin_bps').notNull(),
  totalCost: numeric('total_cost', { precision: 19, scale: 4 }).notNull(),
  recommendedPrice: numeric('recommended_price', { precision: 19, scale: 4 }).notNull(),
  inputSnapshot: jsonb('input_snapshot').notNull(),
  outputSnapshot: jsonb('output_snapshot').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdByAi: boolean('created_by_ai').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('price_calculations_org_config_version_idx').on(table.organizationId, table.configurationId, table.configurationVersionNumber),
  index('price_calculations_org_created_idx').on(table.organizationId, table.createdAt),
]);

export const costComponents = pgTable('cost_components', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  priceCalculationId: uuid('price_calculation_id').notNull().references(() => priceCalculations.id, { onDelete: 'cascade' }),
  componentType: costComponentType('component_type').notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  amount: numeric('amount', { precision: 19, scale: 4 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('cost_components_org_calculation_idx').on(table.organizationId, table.priceCalculationId)]);

export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id),
  configurationId: uuid('configuration_id').notNull().references(() => configurations.id),
  quoteNumber: varchar('quote_number', { length: 80 }).notNull(),
  status: quoteStatus('status').notNull().default('DRAFT'),
  currency: varchar('currency', { length: 3 }).notNull(),
  currentVersion: integer('current_version').notNull().default(1),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('quotes_org_number_uidx').on(table.organizationId, table.quoteNumber),
  index('quotes_org_opportunity_idx').on(table.organizationId, table.opportunityId),
  index('quotes_org_status_idx').on(table.organizationId, table.status),
]);

export const quoteVersions = pgTable('quote_versions', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  priceCalculationId: uuid('price_calculation_id').notNull().references(() => priceCalculations.id),
  configurationVersionNumber: integer('configuration_version_number').notNull(),
  subtotal: numeric('subtotal', { precision: 19, scale: 4 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  taxAmount: numeric('tax_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  total: numeric('total', { precision: 19, scale: 4 }).notNull(),
  estimatedCost: numeric('estimated_cost', { precision: 19, scale: 4 }).notNull(),
  marginAmount: numeric('margin_amount', { precision: 19, scale: 4 }).notNull(),
  marginBps: integer('margin_bps').notNull(),
  pricingSnapshot: jsonb('pricing_snapshot').notNull(),
  reason: text('reason'),
  validUntil: date('valid_until'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdByAi: boolean('created_by_ai').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('quote_versions_number_uidx').on(table.quoteId, table.versionNumber),
  index('quote_versions_org_quote_idx').on(table.organizationId, table.quoteId),
]);

export const quoteItems = pgTable('quote_items', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  quoteVersionId: uuid('quote_version_id').notNull().references(() => quoteVersions.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  configurationId: uuid('configuration_id').notNull().references(() => configurations.id),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: numeric('unit_price', { precision: 19, scale: 4 }).notNull(),
  lineTotal: numeric('line_total', { precision: 19, scale: 4 }).notNull(),
  estimatedCost: numeric('estimated_cost', { precision: 19, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('quote_items_org_version_idx').on(table.organizationId, table.quoteVersionId)]);

export const domainEvents = pgTable('domain_events', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 160 }).notNull(),
  aggregateType: varchar('aggregate_type', { length: 160 }).notNull(),
  aggregateId: uuid('aggregate_id').notNull(),
  eventVersion: integer('event_version').notNull().default(1),
  payload: jsonb('payload').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  correlationId: uuid('correlation_id').notNull(),
  causationId: uuid('causation_id'),
  actorType: actorType('actor_type').notNull(),
  actorId: uuid('actor_id').notNull(),
}, (table) => [index('domain_events_correlation_idx').on(table.correlationId)]);

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actorType: actorType('actor_type').notNull(),
  actorId: uuid('actor_id').notNull(),
  entityType: varchar('entity_type', { length: 160 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 160 }).notNull(),
  beforeData: jsonb('before_data'),
  afterData: jsonb('after_data'),
  reason: text('reason'),
  correlationId: uuid('correlation_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('audit_events_entity_idx').on(table.organizationId, table.entityType, table.entityId)]);

export const outboxEvents = pgTable('outbox_events', {
  id: uuid('id').primaryKey(),
  domainEventId: uuid('domain_event_id').notNull().references(() => domainEvents.id, { onDelete: 'cascade' }),
  topic: varchar('topic', { length: 160 }).notNull(),
  payload: jsonb('payload').notNull(),
  status: outboxStatus('status').notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('outbox_pending_idx').on(table.status, table.availableAt)]);
