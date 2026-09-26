import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditEvents,
  createDatabase,
  domainEvents,
  organizationUsers,
  organizations,
  outboxEvents,
  permissions,
  rolePermissions,
  roles,
  users,
} from '@avitus/database';
import { and, eq, inArray } from 'drizzle-orm';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { TOKENS } from './tokens';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';
const DEV_ORG_ID = '22222222-2222-4222-8222-222222222222';

const connectionString = process.env.DATABASE_URL;
const suite = connectionString ? describe : describe.skip;

suite('Lead API organization isolation', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;

  const otherOrganizationId = randomUUID();
  const otherUserId = randomUUID();
  const otherRoleId = randomUUID();

  beforeAll(async () => {
    if (!external) return;

    await external.db.insert(organizations).values({
      id: otherOrganizationId,
      name: 'Other Organization Test',
      slug: `other-org-${otherOrganizationId}`,
    });
    await external.db.insert(users).values({
      id: otherUserId,
      authProviderId: `test:${otherUserId}`,
      email: `${otherUserId}@local.invalid`,
    });
    await external.db.insert(roles).values({
      id: otherRoleId,
      organizationId: otherOrganizationId,
      code: 'OWNER_TEST',
      name: 'Owner Test',
    });

    const grantedPermissions = await external.db
      .select({ id: permissions.id, code: permissions.code })
      .from(permissions)
      .where(inArray(permissions.code, ['crm.lead.read', 'crm.lead.write']));

    expect(grantedPermissions).toHaveLength(2);
    await external.db.insert(rolePermissions).values(
      grantedPermissions.map((permission) => ({
        roleId: otherRoleId,
        permissionId: permission.id,
      })),
    );
    await external.db.insert(organizationUsers).values({
      id: randomUUID(),
      organizationId: otherOrganizationId,
      userId: otherUserId,
      roleId: otherRoleId,
    });

    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    if (!external) return;
    if (app) {
      const apiPool = app.get<Pool>(TOKENS.pool);
      await app.close();
      await apiPool.end();
    }
    await external.db.delete(organizations).where(eq(organizations.id, otherOrganizationId));
    await external.db.delete(users).where(eq(users.id, otherUserId));
    await external.pool.end();
  });

  it('creates a lead with audit/event/outbox and blocks cross-organization access', async () => {
    if (!external) return;

    const createResponse = await request(app.getHttpServer())
      .post('/leads')
      .set('x-avitus-user-id', DEV_USER_ID)
      .set('x-avitus-organization-id', DEV_ORG_ID)
      .send({ title: 'E2E oak table', source: 'WEBSITE', priority: 'HIGH' })
      .expect(201);

    const leadId = createResponse.body.id as string;
    expect(createResponse.body.organizationId).toBe(DEV_ORG_ID);
    expect(createResponse.body.status).toBe('NEW');

    const eventRows = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          eq(domainEvents.aggregateId, leadId),
          eq(domainEvents.eventType, 'LeadCreated'),
        ),
      );
    expect(eventRows).toHaveLength(1);

    const auditRows = await external.db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, DEV_ORG_ID),
          eq(auditEvents.entityId, leadId),
          eq(auditEvents.action, 'CREATE'),
        ),
      );
    expect(auditRows).toHaveLength(1);

    const outboxRows = await external.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.domainEventId, eventRows[0]!.id));
    expect(outboxRows).toHaveLength(1);
    expect(outboxRows[0]!.status).toBe('PENDING');

    const ownerList = await request(app.getHttpServer())
      .get('/leads')
      .set('x-avitus-user-id', DEV_USER_ID)
      .set('x-avitus-organization-id', DEV_ORG_ID)
      .expect(200);
    expect(ownerList.body.some((lead: { id: string }) => lead.id === leadId)).toBe(true);

    const otherList = await request(app.getHttpServer())
      .get('/leads')
      .set('x-avitus-user-id', otherUserId)
      .set('x-avitus-organization-id', otherOrganizationId)
      .expect(200);
    expect(otherList.body.some((lead: { id: string }) => lead.id === leadId)).toBe(false);

    await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set('x-avitus-user-id', otherUserId)
      .set('x-avitus-organization-id', otherOrganizationId)
      .expect(404);
  });

  it('returns structured validation errors with a correlation id', async () => {
    if (!external) return;

    const response = await request(app.getHttpServer())
      .post('/leads')
      .set('x-avitus-user-id', DEV_USER_ID)
      .set('x-avitus-organization-id', DEV_ORG_ID)
      .send({ title: '', priority: 'INVALID' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION.ERROR');
    expect(response.body.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
