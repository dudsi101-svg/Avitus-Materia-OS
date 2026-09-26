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

suite('Customer identity API', () => {
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
      name: 'Other Customer Test Organization',
      slug: `other-customer-${otherOrganizationId}`,
    });
    await external.db.insert(users).values({
      id: otherUserId,
      authProviderId: `customer-test:${otherUserId}`,
      email: `${otherUserId}@local.invalid`,
    });
    await external.db.insert(roles).values({
      id: otherRoleId,
      organizationId: otherOrganizationId,
      code: 'OWNER_CUSTOMER_TEST',
      name: 'Owner Customer Test',
    });
    const codes = [
      'crm.lead.read',
      'crm.lead.write',
      'crm.opportunity.read',
      'crm.opportunity.write',
      'customer.account.read',
      'customer.account.write',
      'customer.link.write',
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

  it('creates customer truth, normalizes contacts and links it to Lead and Opportunity', async () => {
    if (!external) return;

    const lead = await request(app.getHttpServer())
      .post('/leads')
      .set(devHeaders)
      .send({ title: 'Customer identity prospect', source: 'WEBSITE' })
      .expect(201);
    const opportunity = await request(app.getHttpServer())
      .post('/opportunities')
      .set(devHeaders)
      .send({ leadId: lead.body.id, title: 'Dining table', currency: 'PLN', probability: 40 })
      .expect(201);

    const customer = await request(app.getHttpServer())
      .post('/customers/person-accounts')
      .set(devHeaders)
      .send({
        firstName: 'Jan',
        lastName: 'Kowalski',
        preferredLanguage: 'pl',
        contacts: [
          { contactType: 'EMAIL', value: ' Jan.Kowalski@Example.COM ' },
          { contactType: 'PHONE', value: '+48 501-234-567' },
        ],
      })
      .expect(201);

    expect(customer.body.accountType).toBe('B2C');
    expect(customer.body.status).toBe('PROSPECT');
    expect(customer.body.subject).toMatchObject({
      kind: 'PERSON',
      firstName: 'Jan',
      lastName: 'Kowalski',
      displayName: 'Jan Kowalski',
    });
    expect(customer.body.contacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contactType: 'EMAIL',
          normalizedValue: 'jan.kowalski@example.com',
          isPrimary: true,
        }),
        expect.objectContaining({
          contactType: 'PHONE',
          normalizedValue: '+48501234567',
          isPrimary: true,
        }),
      ]),
    );

    const accountEvents = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          eq(domainEvents.aggregateId, customer.body.id),
          eq(domainEvents.eventType, 'CustomerAccountCreated'),
        ),
      );
    expect(accountEvents).toHaveLength(1);
    const accountAudits = await external.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.organizationId, DEV_ORG_ID), eq(auditEvents.entityId, customer.body.id)));
    expect(accountAudits).toHaveLength(1);
    expect(JSON.stringify(accountAudits[0]?.afterData)).not.toContain('jan.kowalski@example.com');
    expect(
      await external.db
        .select()
        .from(outboxEvents)
        .where(eq(outboxEvents.domainEventId, accountEvents[0]!.id)),
    ).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/customers/${customer.body.id}/link/lead/${lead.body.id}`)
      .set(devHeaders)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/customers/${customer.body.id}/link/opportunity/${opportunity.body.id}`)
      .set(devHeaders)
      .expect(201);

    const leadContext = await request(app.getHttpServer())
      .get(`/customers/for-lead/${lead.body.id}`)
      .set(devHeaders)
      .expect(200);
    expect(leadContext.body.id).toBe(customer.body.id);

    const opportunityContext = await request(app.getHttpServer())
      .get(`/customers/for-opportunity/${opportunity.body.id}`)
      .set(devHeaders)
      .expect(200);
    expect(opportunityContext.body.id).toBe(customer.body.id);

    const linkEvents = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          inArray(domainEvents.eventType, ['CustomerLinkedToLead', 'CustomerLinkedToOpportunity']),
        ),
      );
    expect(linkEvents.filter((event) => event.aggregateId === lead.body.id)).toHaveLength(1);
    expect(linkEvents.filter((event) => event.aggregateId === opportunity.body.id)).toHaveLength(1);

    // Re-linking the same identity is idempotent and does not create a second business event.
    await request(app.getHttpServer())
      .post(`/customers/${customer.body.id}/link/opportunity/${opportunity.body.id}`)
      .set(devHeaders)
      .expect(201);
    const linkEventsAfterRetry = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, DEV_ORG_ID),
          eq(domainEvents.aggregateId, opportunity.body.id),
          eq(domainEvents.eventType, 'CustomerLinkedToOpportunity'),
        ),
      );
    expect(linkEventsAfterRetry).toHaveLength(1);

    const company = await request(app.getHttpServer())
      .post('/customers/company-accounts')
      .set(devHeaders)
      .send({
        legalName: 'Pracownia Projektowa Sp. z o.o.',
        displayName: 'Pracownia Projektowa',
        taxId: 'PL1234567890',
        accountType: 'ARCHITECT',
        contacts: [{ contactType: 'EMAIL', value: 'studio@example.com' }],
      })
      .expect(201);
    expect(company.body.subject).toMatchObject({
      kind: 'COMPANY',
      legalName: 'Pracownia Projektowa Sp. z o.o.',
      taxId: 'PL1234567890',
    });

    const invalidPhone = await request(app.getHttpServer())
      .post('/customers/person-accounts')
      .set(devHeaders)
      .send({
        firstName: 'Invalid',
        lastName: 'Phone',
        contacts: [{ contactType: 'PHONE', value: '12345' }],
      })
      .expect(400);
    expect(invalidPhone.body.error.code).toBe('CUSTOMER.INVALID_PHONE');

    const otherHeaders = {
      'x-avitus-user-id': otherUserId,
      'x-avitus-organization-id': otherOrganizationId,
    };
    await request(app.getHttpServer()).get(`/customers/${customer.body.id}`).set(otherHeaders).expect(404);

    const otherCustomer = await request(app.getHttpServer())
      .post('/customers/person-accounts')
      .set(otherHeaders)
      .send({
        firstName: 'Other',
        lastName: 'Organization',
        contacts: [{ contactType: 'EMAIL', value: 'other@example.com' }],
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/customers/${otherCustomer.body.id}/link/opportunity/${opportunity.body.id}`)
      .set(otherHeaders)
      .expect(404);
  });
});
