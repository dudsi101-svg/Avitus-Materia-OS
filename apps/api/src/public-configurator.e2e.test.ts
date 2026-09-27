import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditEvents,
  createDatabase,
  domainEvents,
  leads,
  outboxEvents,
  publicConfigurationRequests,
  starterId,
} from '@avitus/database';
import { and, eq, inArray } from 'drizzle-orm';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { TOKENS } from './tokens';

const connectionString = process.env.DATABASE_URL;
const publicKey = process.env.PUBLIC_INQUIRY_API_KEY;
const organizationId = process.env.PUBLIC_INQUIRY_ORGANIZATION_ID;
const suite = connectionString && publicKey && organizationId ? describe : describe.skip;

suite('Public configurator API', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;
  const createdLeadIds: string[] = [];
  const tableId = organizationId ? starterId(organizationId, 'product:stol') : '';

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    if (!external) return;
    if (createdLeadIds.length) await external.db.delete(leads).where(inArray(leads.id, createdLeadIds));
    if (app) {
      const apiPool = app.get<Pool>(TOKENS.pool);
      await app.close();
      await apiPool.end();
    }
    await external.pool.end();
  });

  it('keeps both routes closed without the server-to-server credential', async () => {
    await request(app.getHttpServer()).get('/public/configurator/products').expect(401);
    await request(app.getHttpServer()).post('/public/configurator/requests').send({}).expect(401);
  });

  it('lists only configurable products and never exposes price fields', async () => {
    if (!publicKey) return;
    const response = await request(app.getHttpServer())
      .get('/public/configurator/products')
      .set('x-avitus-public-inquiry-key', publicKey)
      .expect(200);
    const products = response.body.products as Array<Record<string, unknown>>;
    const table = products.find((product) => product.id === tableId);
    expect(table).toMatchObject({ sku: 'AM-STOL-01', name: 'Stół / blat' });
    expect((table!.options as Array<{ code: string }>).map((option) => option.code)).toEqual([
      'width_cm',
      'depth_cm',
      'material',
      'base',
    ]);
    const body = JSON.stringify(response.body);
    expect(body).not.toContain('basePrice');
    expect(body).not.toContain('organizationId');
  });

  it('creates a Lead and an immutable configuration snapshot with events, outbox and PII-free audit', async () => {
    if (!external || !publicKey || !organizationId) return;
    const response = await request(app.getHttpServer())
      .post('/public/configurator/requests')
      .set('x-avitus-public-inquiry-key', publicKey)
      .send({
        productId: tableId,
        values: { width_cm: 220, depth_cm: 100, material: 'STARY_DAB', base: 'STAL_CZARNA' },
        name: 'Anna Kreator',
        email: 'ANNA.KREATOR@EXAMPLE.COM',
        phone: '+48 600 700 800',
        message: 'Do jadalni na 8 osób.',
        companyWebsite: '',
      })
      .expect(201);
    expect(response.body).toMatchObject({ ok: true, configurationStatus: 'READY_FOR_PRICING' });
    const requestId = response.body.reference as string;

    const rows = await external.db
      .select()
      .from(publicConfigurationRequests)
      .where(eq(publicConfigurationRequests.id, requestId));
    expect(rows).toHaveLength(1);
    const saved = rows[0]!;
    createdLeadIds.push(saved.leadId);
    expect(saved).toMatchObject({
      organizationId,
      productId: tableId,
      productSku: 'AM-STOL-01',
      email: 'anna.kreator@example.com',
      configurationStatus: 'READY_FOR_PRICING',
      optionValues: { width_cm: 220, depth_cm: 100, material: 'STARY_DAB', base: 'STAL_CZARNA' },
    });

    const leadRows = await external.db.select().from(leads).where(eq(leads.id, saved.leadId));
    expect(leadRows[0]).toMatchObject({ organizationId, source: 'PUBLIC_CONFIGURATOR', status: 'NEW' });

    const events = await external.db
      .select()
      .from(domainEvents)
      .where(and(eq(domainEvents.organizationId, organizationId), eq(domainEvents.aggregateId, requestId)));
    expect(events.map((event) => event.eventType)).toEqual(['PublicConfigurationRequestReceived']);
    const outbox = await external.db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.domainEventId, events[0]!.id));
    expect(outbox).toHaveLength(1);

    const audit = await external.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.organizationId, organizationId), eq(auditEvents.entityId, requestId)));
    expect(audit).toHaveLength(1);
    const logged = JSON.stringify([events, audit]);
    expect(logged).not.toContain('anna.kreator@example.com');
    expect(logged).not.toContain('+48 600 700 800');
    expect(logged).not.toContain('Anna Kreator');
  });

  it('rejects values outside the catalog rules without creating state', async () => {
    if (!external || !publicKey) return;
    const before = await external.db.select().from(publicConfigurationRequests);
    const response = await request(app.getHttpServer())
      .post('/public/configurator/requests')
      .set('x-avitus-public-inquiry-key', publicKey)
      .send({
        productId: tableId,
        values: { width_cm: 999, depth_cm: 100, material: 'PLASTIK', base: 'DREWNO' },
        name: 'Zły Zakres',
        email: 'range@example.com',
      })
      .expect(400);
    expect(response.body.error.code).toMatch(/^CONFIGURATION\./);
    const after = await external.db.select().from(publicConfigurationRequests);
    expect(after).toHaveLength(before.length);
  });
});
