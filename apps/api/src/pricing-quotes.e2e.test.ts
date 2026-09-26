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

suite('Pricing and Quote API', () => {
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
      name: 'Other Pricing Test Organization',
      slug: `other-pricing-${otherOrganizationId}`,
    });
    await external.db.insert(users).values({
      id: otherUserId,
      authProviderId: `pricing-test:${otherUserId}`,
      email: `${otherUserId}@local.invalid`,
    });
    await external.db.insert(roles).values({
      id: otherRoleId,
      organizationId: otherOrganizationId,
      code: 'OWNER_PRICING_TEST',
      name: 'Owner Pricing Test',
    });
    const codes = [
      'pricing.calculation.read',
      'pricing.calculation.create',
      'quote.read',
      'quote.create',
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

  it('pins pricing to configuration versions and preserves immutable quote history', async () => {
    if (!external) return;

    const lead = await request(app.getHttpServer())
      .post('/leads')
      .set(devHeaders)
      .send({ title: 'Sprint 2 pricing customer', source: 'REFERRAL' })
      .expect(201);

    const opportunity = await request(app.getHttpServer())
      .post('/opportunities')
      .set(devHeaders)
      .send({ leadId: lead.body.id, title: 'Priced custom table', currency: 'PLN', probability: 60 })
      .expect(201);

    const configuration = await request(app.getHttpServer())
      .post('/configurations')
      .set(devHeaders)
      .send({
        opportunityId: opportunity.body.id,
        productId: DEV_PRODUCT_ID,
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
    expect(configuration.body.status).toBe('READY_FOR_PRICING');
    expect(configuration.body.currentVersion).toBe(1);

    const priceV1 = await request(app.getHttpServer())
      .post('/pricing/calculations')
      .set(devHeaders)
      .send({
        configurationId: configuration.body.id,
        currency: 'PLN',
        targetMarginBps: 4000,
        components: [
          { componentType: 'MATERIAL', label: 'Oak material', amount: '5000.0000' },
          { componentType: 'LABOR', label: 'Workshop labor', amount: '2000.0000' },
          { componentType: 'TRANSPORT', label: 'Delivery allowance', amount: '500.0000' },
        ],
      })
      .expect(201);
    expect(priceV1.body.totalCost).toBe('7500.0000');
    expect(priceV1.body.recommendedPrice).toBe('12500.0000');
    expect(priceV1.body.configurationVersionNumber).toBe(1);
    expect(priceV1.body.components).toHaveLength(3);

    const pricingEvents = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          eq(domainEvents.aggregateId, priceV1.body.id),
          eq(domainEvents.eventType, 'PriceCalculationCreated'),
        ),
      );
    expect(pricingEvents).toHaveLength(1);
    expect(
      await external.db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.organizationId, DEV_ORG_ID), eq(auditEvents.entityId, priceV1.body.id))),
    ).toHaveLength(1);
    expect(
      await external.db.select().from(outboxEvents).where(eq(outboxEvents.domainEventId, pricingEvents[0]!.id)),
    ).toHaveLength(1);

    const quoteV1 = await request(app.getHttpServer())
      .post('/quotes')
      .set(devHeaders)
      .send({
        opportunityId: opportunity.body.id,
        configurationId: configuration.body.id,
        priceCalculationId: priceV1.body.id,
      })
      .expect(201);
    expect(quoteV1.body.status).toBe('DRAFT');
    expect(quoteV1.body.currentVersion).toBe(1);
    expect(quoteV1.body.versions).toHaveLength(1);
    expect(quoteV1.body.versions[0].total).toBe('12500.0000');
    expect(quoteV1.body.versions[0].estimatedCost).toBe('7500.0000');
    expect(quoteV1.body.versions[0].marginAmount).toBe('5000.0000');
    expect(quoteV1.body.versions[0].items[0].description).toBe('Custom Table');

    const quoteEvents = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          eq(domainEvents.aggregateId, quoteV1.body.id),
          eq(domainEvents.eventType, 'QuoteCreated'),
        ),
      );
    expect(quoteEvents).toHaveLength(1);

    const revisedConfiguration = await request(app.getHttpServer())
      .post(`/configurations/${configuration.body.id}/versions`)
      .set(devHeaders)
      .send({
        reason: 'Customer increased table length',
        configurationData: {
          length_mm: 2400,
          width_mm: 1000,
          thickness_mm: 50,
          wood_type: 'OAK',
          edge_type: 'NATURAL',
          finish: 'OIL_NATURAL',
        },
      })
      .expect(201);
    expect(revisedConfiguration.body.currentVersion).toBe(2);
    expect(revisedConfiguration.body.status).toBe('READY_FOR_PRICING');

    const staleRevision = await request(app.getHttpServer())
      .post(`/quotes/${quoteV1.body.id}/versions`)
      .set(devHeaders)
      .send({ priceCalculationId: priceV1.body.id, reason: 'Must reject stale price' })
      .expect(400);
    expect(staleRevision.body.error.code).toBe('QUOTE.STALE_PRICE_CALCULATION');

    const priceV2 = await request(app.getHttpServer())
      .post('/pricing/calculations')
      .set(devHeaders)
      .send({
        configurationId: configuration.body.id,
        currency: 'PLN',
        targetMarginBps: 4000,
        components: [
          { componentType: 'MATERIAL', label: 'Oak material', amount: '5500.0000' },
          { componentType: 'LABOR', label: 'Workshop labor', amount: '2000.0000' },
          { componentType: 'TRANSPORT', label: 'Delivery allowance', amount: '500.0000' },
        ],
      })
      .expect(201);
    expect(priceV2.body.configurationVersionNumber).toBe(2);
    expect(priceV2.body.totalCost).toBe('8000.0000');
    expect(priceV2.body.recommendedPrice).toBe('13333.3334');

    const quoteV2 = await request(app.getHttpServer())
      .post(`/quotes/${quoteV1.body.id}/versions`)
      .set(devHeaders)
      .send({ priceCalculationId: priceV2.body.id, reason: 'Repriced after larger dimensions' })
      .expect(201);
    expect(quoteV2.body.currentVersion).toBe(2);
    expect(quoteV2.body.versions).toHaveLength(2);
    expect(quoteV2.body.versions[0].total).toBe('12500.0000');
    expect(quoteV2.body.versions[0].configurationVersionNumber).toBe(1);
    expect(quoteV2.body.versions[1].total).toBe('13333.3334');
    expect(quoteV2.body.versions[1].configurationVersionNumber).toBe(2);

    const validation = await request(app.getHttpServer())
      .post('/pricing/calculations')
      .set(devHeaders)
      .send({
        configurationId: configuration.body.id,
        currency: 'PLN',
        targetMarginBps: 4000,
        components: [{ componentType: 'MATERIAL', label: 'Invalid money', amount: '12.12345' }],
      })
      .expect(400);
    expect(validation.body.error.code).toBe('VALIDATION.ERROR');

    const otherHeaders = {
      'x-avitus-user-id': otherUserId,
      'x-avitus-organization-id': otherOrganizationId,
    };
    await request(app.getHttpServer())
      .get(`/pricing/calculations/${priceV1.body.id}`)
      .set(otherHeaders)
      .expect(404);
    await request(app.getHttpServer()).get(`/quotes/${quoteV1.body.id}`).set(otherHeaders).expect(404);
  });
});
