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
const DEV_PRODUCT_ID = '77777777-7777-4777-8777-777777777777';

const connectionString = process.env.DATABASE_URL;
const suite = connectionString ? describe : describe.skip;

suite('Sales foundation API', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;
  const otherOrganizationId = randomUUID();
  const otherUserId = randomUUID();
  const otherRoleId = randomUUID();

  const devHeaders = {
    'x-avitus-user-id': DEV_USER_ID,
    'x-avitus-organization-id': DEV_ORG_ID,
  };

  beforeAll(async () => {
    if (!external) return;
    await external.db.insert(organizations).values({
      id: otherOrganizationId,
      name: 'Other Sales Test Organization',
      slug: `other-sales-${otherOrganizationId}`,
    });
    await external.db.insert(users).values({
      id: otherUserId,
      authProviderId: `sales-test:${otherUserId}`,
      email: `${otherUserId}@local.invalid`,
    });
    await external.db.insert(roles).values({
      id: otherRoleId,
      organizationId: otherOrganizationId,
      code: 'OWNER_SALES_TEST',
      name: 'Owner Sales Test',
    });

    const codes = [
      'crm.lead.read',
      'crm.lead.write',
      'crm.opportunity.read',
      'crm.opportunity.write',
      'catalog.product.read',
      'configurator.configuration.read',
      'configurator.configuration.write',
    ];
    const granted = await external.db
      .select({ id: permissions.id, code: permissions.code })
      .from(permissions)
      .where(inArray(permissions.code, codes));
    expect(granted).toHaveLength(codes.length);
    await external.db.insert(rolePermissions).values(
      granted.map((permission) => ({ roleId: otherRoleId, permissionId: permission.id })),
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

  it('builds Lead -> Opportunity -> versioned Configuration and preserves organization isolation', async () => {
    if (!external) return;

    const leadResponse = await request(app.getHttpServer())
      .post('/leads')
      .set(devHeaders)
      .send({ title: 'Sprint 1 custom table', source: 'WEBSITE' })
      .expect(201);
    const leadId = leadResponse.body.id as string;

    const opportunityResponse = await request(app.getHttpServer())
      .post('/opportunities')
      .set(devHeaders)
      .send({
        leadId,
        title: 'Custom oak table opportunity',
        estimatedValue: 15000,
        currency: 'PLN',
        probability: 40,
      })
      .expect(201);
    const opportunityId = opportunityResponse.body.id as string;
    expect(opportunityResponse.body.status).toBe('OPEN');
    expect(opportunityResponse.body.organizationId).toBe(DEV_ORG_ID);

    const opportunityEvents = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          eq(domainEvents.aggregateId, opportunityId),
          eq(domainEvents.eventType, 'OpportunityCreated'),
        ),
      );
    expect(opportunityEvents).toHaveLength(1);
    expect(
      await external.db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.organizationId, DEV_ORG_ID), eq(auditEvents.entityId, opportunityId))),
    ).toHaveLength(1);
    expect(
      await external.db
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.domainEventId, opportunityEvents[0]!.id)),
    ).toHaveLength(1);

    const catalogResponse = await request(app.getHttpServer())
      .get(`/catalog/products/${DEV_PRODUCT_ID}`)
      .set(devHeaders)
      .expect(200);
    expect(catalogResponse.body.productType).toBe('CONFIGURABLE');
    expect(catalogResponse.body.options.length).toBeGreaterThanOrEqual(6);

    const configurationResponse = await request(app.getHttpServer())
      .post('/configurations')
      .set(devHeaders)
      .send({
        opportunityId,
        productId: DEV_PRODUCT_ID,
        configurationData: { length_mm: 2200 },
      })
      .expect(201);
    const configurationId = configurationResponse.body.id as string;
    expect(configurationResponse.body.status).toBe('INCOMPLETE');
    expect(configurationResponse.body.currentVersion).toBe(1);
    expect(configurationResponse.body.versions[0].readinessIssues).toContain('REQUIRED:finish');

    const revisedResponse = await request(app.getHttpServer())
      .post(`/configurations/${configurationId}/versions`)
      .set(devHeaders)
      .send({
        reason: 'Customer completed dimensions and material choices',
        configurationData: {
          length_mm: 2200,
          width_mm: 1000,
          thickness_mm: 50,
          wood_type: 'OAK',
          edge_type: 'NATURAL',
          finish: 'OIL_NATURAL',
        },
      })
      .expect(201);
    expect(revisedResponse.body.status).toBe('READY_FOR_PRICING');
    expect(revisedResponse.body.currentVersion).toBe(2);
    expect(revisedResponse.body.versions).toHaveLength(2);
    expect(revisedResponse.body.versions[0].versionNumber).toBe(1);
    expect(revisedResponse.body.versions[1].versionNumber).toBe(2);

    const invalidRevision = await request(app.getHttpServer())
      .post(`/configurations/${configurationId}/versions`)
      .set(devHeaders)
      .send({
        reason: 'Invalid dimension test',
        configurationData: {
          length_mm: 500,
          width_mm: 1000,
          thickness_mm: 50,
          wood_type: 'OAK',
          edge_type: 'NATURAL',
          finish: 'OIL_NATURAL',
        },
      })
      .expect(400);
    expect(invalidRevision.body.error.code).toBe('CONFIGURATION.OPTION_BELOW_MIN');

    const otherHeaders = {
      'x-avitus-user-id': otherUserId,
      'x-avitus-organization-id': otherOrganizationId,
    };

    await request(app.getHttpServer())
      .get(`/opportunities/${opportunityId}`)
      .set(otherHeaders)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/configurations/${configurationId}`)
      .set(otherHeaders)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/catalog/products/${DEV_PRODUCT_ID}`)
      .set(otherHeaders)
      .expect(404);

    const crossOrgCreate = await request(app.getHttpServer())
      .post('/opportunities')
      .set(otherHeaders)
      .send({ leadId, title: 'Must not cross tenant boundary' })
      .expect(404);
    expect(crossOrgCreate.body.error.code).toBe('CRM.LEAD_NOT_FOUND');
  });
});
