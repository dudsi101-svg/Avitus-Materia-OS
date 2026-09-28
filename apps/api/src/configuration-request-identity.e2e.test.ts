import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditEvents,
  contactPoints,
  createDatabase,
  customerAccounts,
  organizations,
  persons,
  starterId,
} from '@avitus/database';
import { and, eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { TOKENS } from './tokens';

const DEV_USER_ID = '11111111-1111-4111-8111-111111111111';
const DEV_ORG_ID = '22222222-2222-4222-8222-222222222222';
const connectionString = process.env.DATABASE_URL;
const publicKey = process.env.PUBLIC_INQUIRY_API_KEY;
const publicOrganizationId = process.env.PUBLIC_INQUIRY_ORGANIZATION_ID;
const suite = connectionString && publicKey && publicOrganizationId === DEV_ORG_ID ? describe : describe.skip;
const devHeaders = { 'x-avitus-user-id': DEV_USER_ID, 'x-avitus-organization-id': DEV_ORG_ID };
const values = {
  width_cm: 220,
  depth_cm: 100,
  thickness_cm: 6,
  material: 'DAB',
  edge: 'NATURALNA',
  finish: 'OLEJ_NATURALNY',
  base: 'DREWNO',
};

suite('Configuration request customer identity handoff', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;
  const foreignOrganizationId = randomUUID();

  beforeAll(async () => {
    if (!external) return;
    await external.db.insert(organizations).values({
      id: foreignOrganizationId,
      name: 'Foreign Identity Candidate Organization',
      slug: `foreign-identity-${foreignOrganizationId}`,
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
    await external.db.delete(organizations).where(eq(organizations.id, foreignOrganizationId));
    await external.pool.end();
  });

  async function submitAndConvert(name: string, email: string, phone?: string) {
    if (!publicKey) throw new Error('PUBLIC_INQUIRY_API_KEY missing');
    const submitted = await request(app.getHttpServer())
      .post('/public/configurator/requests')
      .set('x-avitus-public-inquiry-key', publicKey)
      .send({
        productId: starterId(DEV_ORG_ID, 'product:stol'),
        values,
        name,
        email,
        ...(phone ? { phone } : {}),
        companyWebsite: '',
      })
      .expect(201);
    const requestId = submitted.body.reference as string;
    const converted = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/convert`)
      .set(devHeaders)
      .send({})
      .expect(201);
    return { requestId, converted: converted.body as { opportunityId: string; configurationId: string } };
  }

  it('suggests only same-organization exact matches and links one account to Lead + Opportunity idempotently', async () => {
    if (!external) return;
    const email = `identity-match-${randomUUID()}@example.com`;

    const foreignPersonId = randomUUID();
    const foreignAccountId = randomUUID();
    await external.db.insert(persons).values({
      id: foreignPersonId,
      organizationId: foreignOrganizationId,
      firstName: 'Foreign',
      lastName: 'Candidate',
      displayName: 'Foreign Candidate',
    });
    await external.db.insert(customerAccounts).values({
      id: foreignAccountId,
      organizationId: foreignOrganizationId,
      accountType: 'B2C',
      status: 'PROSPECT',
      personId: foreignPersonId,
    });
    await external.db.insert(contactPoints).values({
      id: randomUUID(),
      organizationId: foreignOrganizationId,
      customerAccountId: foreignAccountId,
      contactType: 'EMAIL',
      value: email,
      normalizedValue: email,
      isPrimary: true,
    });

    const customer = await request(app.getHttpServer())
      .post('/customers/person-accounts')
      .set(devHeaders)
      .send({
        firstName: 'Ewa',
        lastName: 'Istniejąca',
        contacts: [{ contactType: 'EMAIL', value: email.toUpperCase() }],
      })
      .expect(201);

    const { requestId } = await submitAndConvert('Ewa Istniejąca', email);
    const identity = await request(app.getHttpServer())
      .get(`/configuration-requests/${requestId}/identity`)
      .set(devHeaders)
      .expect(200);
    expect(identity.body.state).toBe('SUGGESTED');
    expect(identity.body.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: customer.body.id, matchedOn: ['EMAIL'] }),
      ]),
    );
    expect((identity.body.candidates as Array<{ id: string }>).some((candidate) => candidate.id === foreignAccountId)).toBe(false);

    const linked = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/identity/link-existing`)
      .set(devHeaders)
      .send({ customerAccountId: customer.body.id })
      .expect(201);
    expect(linked.body).toMatchObject({
      state: 'LINKED',
      leadCustomerAccountId: customer.body.id,
      opportunityCustomerAccountId: customer.body.id,
    });

    const repeated = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/identity/link-existing`)
      .set(devHeaders)
      .send({ customerAccountId: customer.body.id })
      .expect(201);
    expect(repeated.body.state).toBe('LINKED');
  });

  it('creates a person from confirmed names and links both sales entities atomically without PII in audit', async () => {
    if (!external) return;
    const email = `new-identity-${randomUUID()}@example.com`;
    const { requestId } = await submitAndConvert('Anna Nowa', email, '+48 501-234-567');

    const before = await request(app.getHttpServer())
      .get(`/configuration-requests/${requestId}/identity`)
      .set(devHeaders)
      .expect(200);
    expect(before.body.state).toBe('UNLINKED');

    const created = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/identity/create-person`)
      .set(devHeaders)
      .send({ firstName: 'Anna', lastName: 'Nowa' })
      .expect(201);
    expect(created.body.state).toBe('LINKED');
    expect(created.body.leadCustomerAccountId).toBe(created.body.opportunityCustomerAccountId);

    const customerId = created.body.leadCustomerAccountId as string;
    const customer = await request(app.getHttpServer()).get(`/customers/${customerId}`).set(devHeaders).expect(200);
    expect(customer.body.subject).toMatchObject({ kind: 'PERSON', firstName: 'Anna', lastName: 'Nowa' });
    expect(customer.body.contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ contactType: 'EMAIL', normalizedValue: email.toLowerCase() }),
        expect.objectContaining({ contactType: 'PHONE', normalizedValue: '+48501234567' }),
      ]),
    );

    const audits = await external.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.organizationId, DEV_ORG_ID), eq(auditEvents.entityId, customerId)));
    expect(audits.length).toBeGreaterThan(0);
    expect(JSON.stringify(audits)).not.toContain(email);
    expect(JSON.stringify(audits)).not.toContain('+48501234567');

    await request(app.getHttpServer())
      .get('/configuration-requests/not-a-uuid/identity')
      .set(devHeaders)
      .expect(404);
  });

  it('rejects a conflicting existing Lead link before partially linking Opportunity', async () => {
    const email = `identity-conflict-${randomUUID()}@example.com`;
    const { requestId, converted } = await submitAndConvert('Konflikt Klienta', email);
    const identity = await request(app.getHttpServer())
      .get(`/configuration-requests/${requestId}/identity`)
      .set(devHeaders)
      .expect(200);

    const customerA = await request(app.getHttpServer())
      .post('/customers/person-accounts')
      .set(devHeaders)
      .send({
        firstName: 'Klient',
        lastName: 'A',
        contacts: [{ contactType: 'EMAIL', value: `a-${email}` }],
      })
      .expect(201);
    const customerB = await request(app.getHttpServer())
      .post('/customers/person-accounts')
      .set(devHeaders)
      .send({
        firstName: 'Klient',
        lastName: 'B',
        contacts: [{ contactType: 'EMAIL', value: `b-${email}` }],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/customers/${customerA.body.id}/link/lead/${identity.body.leadId}`)
      .set(devHeaders)
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/identity/link-existing`)
      .set(devHeaders)
      .send({ customerAccountId: customerB.body.id })
      .expect(409);
    expect(conflict.body.error.code).toBe('CUSTOMER.SALES_CONTEXT_LINK_CONFLICT');

    const opportunityContext = await request(app.getHttpServer())
      .get(`/customers/for-opportunity/${converted.opportunityId}`)
      .set(devHeaders)
      .expect(200);
    expect(opportunityContext.body).toBeNull();
  });
});
