import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditEvents,
  createDatabase,
  domainEvents,
  orders,
  projects,
  quoteAcceptances,
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
const headers = { 'x-avitus-user-id': DEV_USER_ID, 'x-avitus-organization-id': DEV_ORG_ID };
const connectionString = process.env.DATABASE_URL;
const suite = connectionString ? describe : describe.skip;

suite('Accepted Quote -> Order + Project API', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;

  beforeAll(async () => {
    if (!external) return;
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
    await external.pool.end();
  });

  it('accepts the exact SENT Quote version and atomically creates one Order + one Project', async () => {
    if (!external) return;

    const lead = await request(app.getHttpServer())
      .post('/leads').set(headers)
      .send({ title: 'Order flow buyer', source: 'REFERRAL' }).expect(201);
    const opportunity = await request(app.getHttpServer())
      .post('/opportunities').set(headers)
      .send({ leadId: lead.body.id, title: 'Accepted oak table', currency: 'PLN', probability: 90 }).expect(201);
    const customer = await request(app.getHttpServer())
      .post('/customers/person-accounts').set(headers)
      .send({
        firstName: 'Jan',
        lastName: 'Orderflow',
        contacts: [
          { contactType: 'EMAIL', value: 'jan.orderflow@example.com', isPrimary: true },
          { contactType: 'PHONE', value: '+48 501 888 999', isPrimary: true },
        ],
      }).expect(201);
    await request(app.getHttpServer())
      .post(`/customers/${customer.body.id}/link/opportunity/${opportunity.body.id}`)
      .set(headers).send({}).expect(201);

    const configuration = await request(app.getHttpServer())
      .post('/configurations').set(headers)
      .send({
        opportunityId: opportunity.body.id,
        productId: DEV_PRODUCT_ID,
        configurationData: {
          length_mm: 2400,
          width_mm: 1000,
          thickness_mm: 50,
          wood_type: 'OAK',
          edge_type: 'NATURAL',
          finish: 'OIL_NATURAL',
        },
      }).expect(201);
    const price = await request(app.getHttpServer())
      .post('/pricing/calculations').set(headers)
      .send({
        configurationId: configuration.body.id,
        currency: 'PLN',
        targetMarginBps: 4000,
        components: [
          { componentType: 'MATERIAL', label: 'Oak', amount: '6000.0000' },
          { componentType: 'LABOR', label: 'Labor', amount: '2500.0000' },
          { componentType: 'TRANSPORT', label: 'Delivery', amount: '500.0000' },
        ],
      }).expect(201);
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const quote = await request(app.getHttpServer())
      .post('/quotes').set(headers)
      .send({
        opportunityId: opportunity.body.id,
        configurationId: configuration.body.id,
        priceCalculationId: price.body.id,
        taxRateBps: 2300,
        validUntil,
      }).expect(201);
    await request(app.getHttpServer()).post(`/quotes/${quote.body.id}/ready`).set(headers).send({}).expect(201);
    await request(app.getHttpServer()).post(`/quotes/${quote.body.id}/sent`).set(headers).send({}).expect(201);

    const accepted = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/accept`).set(headers).send({}).expect(201);
    expect(accepted.body.status).toBe('ACCEPTED');
    expect(accepted.body.currentVersion).toBe(1);

    const acceptedAgain = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/accept`).set(headers).send({}).expect(201);
    expect(acceptedAgain.body.status).toBe('ACCEPTED');

    const created = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/create-order`).set(headers).send({}).expect(201);
    expect(created.body.order).toMatchObject({
      quoteId: quote.body.id,
      quoteVersionNumber: 1,
      opportunityId: opportunity.body.id,
      customerAccountId: customer.body.id,
      configurationId: configuration.body.id,
      currency: 'PLN',
      subtotal: quote.body.versions[0].subtotal,
      discountAmount: quote.body.versions[0].discountAmount,
      taxAmount: quote.body.versions[0].taxAmount,
      total: quote.body.versions[0].total,
      estimatedCost: quote.body.versions[0].estimatedCost,
      marginAmount: quote.body.versions[0].marginAmount,
      marginBps: quote.body.versions[0].marginBps,
      status: 'CONFIRMED',
    });
    expect(created.body.order.buyerSnapshot.customerAccountId).toBe(customer.body.id);
    expect(created.body.project).toMatchObject({
      orderId: created.body.order.id,
      configurationId: configuration.body.id,
      status: 'PLANNING',
    });
    expect(created.body.project).not.toHaveProperty('promisedAt');

    const createdAgain = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/create-order`).set(headers).send({}).expect(201);
    expect(createdAgain.body.order.id).toBe(created.body.order.id);
    expect(createdAgain.body.project.id).toBe(created.body.project.id);

    const readOrder = await request(app.getHttpServer())
      .get(`/orders/${created.body.order.id}`).set(headers).expect(200);
    expect(readOrder.body.orderNumber).toBe(created.body.order.orderNumber);
    const readProject = await request(app.getHttpServer())
      .get(`/projects/${created.body.project.id}`).set(headers).expect(200);
    expect(readProject.body.status).toBe('PLANNING');

    const revisionAfterAcceptance = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/versions`).set(headers)
      .send({ priceCalculationId: price.body.id, reason: 'Accepted truth cannot be rewritten' })
      .expect(400);
    expect(revisionAfterAcceptance.body.error.code).toBe('QUOTE.IMMUTABLE_VERSION_STATE');

    const acceptanceRows = await external.db.select().from(quoteAcceptances)
      .where(and(eq(quoteAcceptances.organizationId, DEV_ORG_ID), eq(quoteAcceptances.quoteId, quote.body.id)));
    expect(acceptanceRows).toHaveLength(1);
    expect(acceptanceRows[0]?.quoteVersionNumber).toBe(1);

    const orderRows = await external.db.select().from(orders)
      .where(and(eq(orders.organizationId, DEV_ORG_ID), eq(orders.quoteId, quote.body.id)));
    expect(orderRows).toHaveLength(1);
    const projectRows = await external.db.select().from(projects)
      .where(and(eq(projects.organizationId, DEV_ORG_ID), eq(projects.orderId, created.body.order.id)));
    expect(projectRows).toHaveLength(1);

    const aggregateIds = [quote.body.id, created.body.order.id, created.body.project.id];
    const events = await external.db.select().from(domainEvents)
      .where(and(eq(domainEvents.organizationId, DEV_ORG_ID), inArray(domainEvents.aggregateId, aggregateIds)));
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining(['QuoteAccepted', 'OrderCreated', 'ProjectCreated']));
    const eventJson = JSON.stringify(events);
    expect(eventJson).not.toContain('jan.orderflow@example.com');
    expect(eventJson).not.toContain('+48 501 888 999');

    const audits = await external.db.select().from(auditEvents)
      .where(and(eq(auditEvents.organizationId, DEV_ORG_ID), inArray(auditEvents.entityId, aggregateIds)));
    expect(audits.map((audit) => audit.action)).toEqual(expect.arrayContaining(['ACCEPT', 'CREATE_FROM_ACCEPTED_QUOTE', 'CREATE_FROM_ORDER']));
    const auditJson = JSON.stringify(audits);
    expect(auditJson).not.toContain('jan.orderflow@example.com');
    expect(auditJson).not.toContain('+48 501 888 999');
  });
});
