import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { auditEvents, createDatabase, domainEvents } from '@avitus/database';
import { and, eq } from 'drizzle-orm';
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

suite('Quote governance API', () => {
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

  it('snapshots buyer, approves discount, gates READY and transitions READY -> SENT', async () => {
    if (!external) return;
    const lead = await request(app.getHttpServer())
      .post('/leads').set(headers)
      .send({ title: 'Governed quote buyer', source: 'REFERRAL' }).expect(201);
    const opportunity = await request(app.getHttpServer())
      .post('/opportunities').set(headers)
      .send({ leadId: lead.body.id, title: 'Governed table', currency: 'PLN', probability: 70 }).expect(201);

    const customer = await request(app.getHttpServer())
      .post('/customers/person-accounts').set(headers)
      .send({
        firstName: 'Anna',
        lastName: 'Governance',
        contacts: [
          { contactType: 'EMAIL', value: 'Anna.Governance@Example.com', isPrimary: true },
          { contactType: 'PHONE', value: '+48 501 222 333', isPrimary: true },
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
          length_mm: 2200,
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
          { componentType: 'MATERIAL', label: 'Oak', amount: '5000.0000' },
          { componentType: 'LABOR', label: 'Labor', amount: '2000.0000' },
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
        discountAmount: '500.0000',
        discountReason: 'Commercial launch discount',
        validUntil,
      }).expect(201);

    expect(quote.body.status).toBe('DRAFT');
    expect(quote.body.versions[0]).toMatchObject({
      subtotal: '12500.0000',
      discountAmount: '500.0000',
      taxRateBps: 2300,
      taxAmount: '2760.0000',
      total: '14760.0000',
      marginAmount: '4500.0000',
      marginBps: 3750,
      buyerSnapshot: {
        customerAccountId: customer.body.id,
        subjectType: 'PERSON',
        displayName: 'Anna Governance',
        email: 'Anna.Governance@Example.com',
        phone: '+48 501 222 333',
      },
    });

    const beforeApproval = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/ready`).set(headers).send({}).expect(400);
    expect(beforeApproval.body.error.code).toBe('QUOTE.DISCOUNT_APPROVAL_REQUIRED');

    const approved = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/approve-discount`).set(headers).send({}).expect(201);
    expect(approved.body.versions[0].discountApprovedByUserId).toBe(DEV_USER_ID);

    const ready = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/ready`).set(headers).send({}).expect(201);
    expect(ready.body.status).toBe('READY');
    expect(ready.body.readyAt).toBeTruthy();

    const sent = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/sent`).set(headers).send({}).expect(201);
    expect(sent.body.status).toBe('SENT');
    expect(sent.body.sentAt).toBeTruthy();

    const revisionAfterSent = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/versions`).set(headers)
      .send({ priceCalculationId: price.body.id, reason: 'Must not rewrite sent commercial truth' })
      .expect(400);
    expect(revisionAfterSent.body.error.code).toBe('QUOTE.IMMUTABLE_VERSION_STATE');

    const events = await external.db.select().from(domainEvents)
      .where(and(eq(domainEvents.organizationId, DEV_ORG_ID), eq(domainEvents.aggregateId, quote.body.id)));
    const eventJson = JSON.stringify(events);
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining(['QuoteCreated', 'QuoteDiscountApproved', 'QuoteReady', 'QuoteSent']));
    expect(eventJson).not.toContain('Anna.Governance@Example.com');
    expect(eventJson).not.toContain('+48 501 222 333');

    const audits = await external.db.select().from(auditEvents)
      .where(and(eq(auditEvents.organizationId, DEV_ORG_ID), eq(auditEvents.entityId, quote.body.id)));
    const auditJson = JSON.stringify(audits);
    expect(audits.map((audit) => audit.action)).toEqual(expect.arrayContaining(['CREATE', 'APPROVE_DISCOUNT', 'READY', 'SENT']));
    expect(auditJson).not.toContain('Anna.Governance@Example.com');
    expect(auditJson).not.toContain('+48 501 222 333');
  });

  it('blocks READY when Opportunity has no CustomerAccount', async () => {
    const lead = await request(app.getHttpServer())
      .post('/leads').set(headers)
      .send({ title: 'No buyer quote', source: 'REFERRAL' }).expect(201);
    const opportunity = await request(app.getHttpServer())
      .post('/opportunities').set(headers)
      .send({ leadId: lead.body.id, title: 'No buyer table', currency: 'PLN', probability: 40 }).expect(201);
    const configuration = await request(app.getHttpServer())
      .post('/configurations').set(headers)
      .send({
        opportunityId: opportunity.body.id,
        productId: DEV_PRODUCT_ID,
        configurationData: {
          length_mm: 2000,
          width_mm: 900,
          thickness_mm: 50,
          wood_type: 'OAK',
          edge_type: 'STRAIGHT',
          finish: 'OIL_NATURAL',
        },
      }).expect(201);
    const price = await request(app.getHttpServer())
      .post('/pricing/calculations').set(headers)
      .send({ configurationId: configuration.body.id, currency: 'PLN', targetMarginBps: 3000, components: [{ componentType: 'MATERIAL', label: 'Material', amount: '7000.0000' }] })
      .expect(201);
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const quote = await request(app.getHttpServer())
      .post('/quotes').set(headers)
      .send({ opportunityId: opportunity.body.id, configurationId: configuration.body.id, priceCalculationId: price.body.id, taxRateBps: 2300, validUntil })
      .expect(201);
    const blocked = await request(app.getHttpServer())
      .post(`/quotes/${quote.body.id}/ready`).set(headers).send({}).expect(400);
    expect(blocked.body.error.code).toBe('QUOTE.BUYER_REQUIRED');
  });
});
