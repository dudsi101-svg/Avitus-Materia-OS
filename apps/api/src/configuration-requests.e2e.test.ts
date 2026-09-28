import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditEvents,
  configurationVersions,
  createDatabase,
  opportunities,
  organizations,
  organizationUsers,
  permissions,
  rolePermissions,
  roles,
  starterId,
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
const publicKey = process.env.PUBLIC_INQUIRY_API_KEY;
const publicOrganizationId = process.env.PUBLIC_INQUIRY_ORGANIZATION_ID;
const suite =
  connectionString && publicKey && publicOrganizationId === DEV_ORG_ID ? describe : describe.skip;

const devHeaders = { 'x-avitus-user-id': DEV_USER_ID, 'x-avitus-organization-id': DEV_ORG_ID };

suite('Configuration request conversion API', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;
  const otherOrganizationId = randomUUID();
  const otherUserId = randomUUID();
  const otherRoleId = randomUUID();
  const otherHeaders = { 'x-avitus-user-id': otherUserId, 'x-avitus-organization-id': otherOrganizationId };
  const values = {
    width_cm: 240,
    depth_cm: 100,
    thickness_cm: 6,
    material: 'DAB',
    edge: 'NATURALNA',
    finish: 'OLEJ_NATURALNY',
    base: 'DREWNO',
  };

  beforeAll(async () => {
    if (!external) return;
    await external.db.insert(organizations).values({
      id: otherOrganizationId,
      name: 'Other Conversion Test Organization',
      slug: `other-conversion-${otherOrganizationId}`,
    });
    await external.db.insert(users).values({
      id: otherUserId,
      authProviderId: `conversion-test:${otherUserId}`,
      email: `${otherUserId}@local.invalid`,
    });
    await external.db.insert(roles).values({
      id: otherRoleId,
      organizationId: otherOrganizationId,
      code: 'OWNER_CONVERSION_TEST',
      name: 'Owner Conversion Test',
    });
    const codes = [
      'acquisition.configuration_request.read',
      'acquisition.configuration_request.convert',
      'crm.opportunity.write',
      'configurator.configuration.write',
    ];
    const granted = await external.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.code, codes));
    expect(granted).toHaveLength(codes.length);
    await external.db
      .insert(rolePermissions)
      .values(granted.map((permission) => ({ roleId: otherRoleId, permissionId: permission.id })));
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

  it('converts a configurator request once into Opportunity + Configuration with the exact values', async () => {
    if (!external || !publicKey) return;
    const submitted = await request(app.getHttpServer())
      .post('/public/configurator/requests')
      .set('x-avitus-public-inquiry-key', publicKey)
      .send({
        productId: starterId(DEV_ORG_ID, 'product:stol'),
        values,
        name: 'Ewa Konwersja',
        email: 'ewa.konwersja@example.com',
        companyWebsite: '',
      })
      .expect(201);
    const requestId = submitted.body.reference as string;

    const listed = await request(app.getHttpServer()).get('/configuration-requests').set(devHeaders).expect(200);
    const row = (listed.body as Array<{ id: string; conversion?: unknown; email: string }>).find(
      (item) => item.id === requestId,
    );
    expect(row).toMatchObject({ email: 'ewa.konwersja@example.com' });
    expect(row?.conversion).toBeUndefined();

    // Another organization can neither see nor convert it.
    const foreignList = await request(app.getHttpServer())
      .get('/configuration-requests')
      .set(otherHeaders)
      .expect(200);
    expect((foreignList.body as Array<{ id: string }>).some((item) => item.id === requestId)).toBe(false);
    await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/convert`)
      .set(otherHeaders)
      .send({})
      .expect(404);

    const converted = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/convert`)
      .set(devHeaders)
      .send({})
      .expect(201);
    expect(converted.body).toMatchObject({ requestId, configurationStatus: 'READY_FOR_PRICING' });

    const [opportunity] = await external.db
      .select()
      .from(opportunities)
      .where(eq(opportunities.id, converted.body.opportunityId));
    expect(opportunity).toMatchObject({ organizationId: DEV_ORG_ID, status: 'OPEN', ownerUserId: DEV_USER_ID });
    expect(opportunity?.title).toBe('Stół / blat — Ewa Konwersja');

    const versions = await external.db
      .select()
      .from(configurationVersions)
      .where(eq(configurationVersions.configurationId, converted.body.configurationId));
    expect(versions).toHaveLength(1);
    expect(versions[0]?.configurationData).toEqual(values);

    const conversionAudit = await external.db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.entityId, requestId), eq(auditEvents.action, 'CONVERT')));
    expect(conversionAudit).toHaveLength(1);
    expect(JSON.stringify(conversionAudit)).not.toContain('ewa.konwersja@example.com');

    // The configuration is immediately usable by pricing.
    await request(app.getHttpServer())
      .get(`/configurations/${converted.body.configurationId}`)
      .set(devHeaders)
      .expect(200);

    const again = await request(app.getHttpServer())
      .post(`/configuration-requests/${requestId}/convert`)
      .set(devHeaders)
      .send({})
      .expect(409);
    expect(again.body.error.code).toBe('ACQUISITION.REQUEST_CONVERSION_CONFLICT');

    const relisted = await request(app.getHttpServer()).get('/configuration-requests').set(devHeaders).expect(200);
    expect(
      (relisted.body as Array<{ id: string; conversion?: { opportunityId: string } }>).find((item) => item.id === requestId)
        ?.conversion?.opportunityId,
    ).toBe(converted.body.opportunityId);
  });

  it('returns 404 for malformed and unknown request ids', async () => {
    await request(app.getHttpServer()).post('/configuration-requests/not-a-uuid/convert').set(devHeaders).send({}).expect(404);
    await request(app.getHttpServer())
      .post(`/configuration-requests/${randomUUID()}/convert`)
      .set(devHeaders)
      .send({})
      .expect(404);
  });
});
