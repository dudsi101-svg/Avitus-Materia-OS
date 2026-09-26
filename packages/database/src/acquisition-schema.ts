import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { leads, organizations } from './schema';

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
