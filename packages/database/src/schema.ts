import {
  index,
  integer,
  jsonb,
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
  'NEW',
  'CONTACT_PENDING',
  'CONTACTED',
  'QUALIFYING',
  'QUALIFIED',
  'DISCOVERY',
  'CONFIGURING',
  'QUOTE_PENDING',
  'QUOTED',
  'NEGOTIATION',
  'WON',
  'LOST',
  'DORMANT',
  'DISQUALIFIED',
]);
export const leadPriority = pgEnum('lead_priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT']);
export const actorType = pgEnum('actor_type', [
  'USER',
  'AI_AGENT',
  'SYSTEM',
  'INTEGRATION',
  'CUSTOMER',
  'PARTNER',
]);
export const outboxStatus = pgEnum('outbox_status', ['PENDING', 'PUBLISHED', 'FAILED']);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    status: organizationStatus('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('organizations_slug_uidx').on(table.slug)],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    authProviderId: varchar('auth_provider_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    status: userStatus('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_auth_provider_uidx').on(table.authProviderId)],
);

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

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

export const organizationUsers = pgTable(
  'organization_users',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id),
    status: membershipStatus('status').notNull().default('ACTIVE'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('organization_users_org_user_uidx').on(table.organizationId, table.userId)],
);

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    source: varchar('source', { length: 120 }),
    status: leadStatus('status').notNull().default('NEW'),
    priority: leadPriority('priority').notNull().default('NORMAL'),
    assignedToUserId: uuid('assigned_to_user_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('leads_org_created_idx').on(table.organizationId, table.createdAt),
    index('leads_org_status_idx').on(table.organizationId, table.status),
  ],
);

export const domainEvents = pgTable(
  'domain_events',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
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
  },
  (table) => [index('domain_events_correlation_idx').on(table.correlationId)],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
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
  },
  (table) => [index('audit_events_entity_idx').on(table.organizationId, table.entityType, table.entityId)],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey(),
    domainEventId: uuid('domain_event_id')
      .notNull()
      .references(() => domainEvents.id, { onDelete: 'cascade' }),
    topic: varchar('topic', { length: 160 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: outboxStatus('status').notNull().default('PENDING'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('outbox_pending_idx').on(table.status, table.availableAt)],
);
