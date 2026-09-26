import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditEvents,
  createDatabase,
  domainEvents,
  leads,
  publicInquirySubmissions,
} from '@avitus/database';
import { and, eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { TOKENS } from './tokens';

const connectionString = process.env.DATABASE_URL;
const inquiryKey = process.env.PUBLIC_INQUIRY_API_KEY;
const organizationId = process.env.PUBLIC_INQUIRY_ORGANIZATION_ID;
const suite = connectionString && inquiryKey && organizationId ? describe : describe.skip;

suite('Public inquiry API', () => {
  let app: INestApplication;
  const external = connectionString ? createDatabase(connectionString) : null;
  let createdLeadId: string | undefined;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  });

  afterAll(async () => {
    if (!external) return;
    if (createdLeadId) await external.db.delete(leads).where(eq(leads.id, createdLeadId));
    if (app) {
      const apiPool = app.get<Pool>(TOKENS.pool);
      await app.close();
      await apiPool.end();
    }
    await external.pool.end();
  });

  it('keeps the public route closed without the server-to-server credential', async () => {
    await request(app.getHttpServer())
      .post('/public/inquiries')
      .send({
        name: 'Public Visitor',
        email: 'visitor@example.com',
        projectType: 'TABLE',
        message: 'Potrzebuję stołu dębowego do salonu.',
        companyWebsite: '',
      })
      .expect(401);
  });

  it('creates one CRM lead and an immutable inquiry intake record without exposing PII in events', async () => {
    if (!external || !inquiryKey || !organizationId) return;

    const response = await request(app.getHttpServer())
      .post('/public/inquiries')
      .set('x-avitus-public-inquiry-key', inquiryKey)
      .send({
        name: 'Jan Testowy',
        email: 'JAN.TESTOWY@EXAMPLE.COM',
        phone: '+48 500 600 700',
        projectType: 'TABLE',
        message: 'Stół dębowy 2200 x 1000 mm, naturalna krawędź i jasne olejowanie.',
        companyWebsite: '',
      })
      .expect(201);

    expect(response.body.ok).toBe(true);
    const inquiryId = response.body.reference as string;

    const inquiryRows = await external.db
      .select()
      .from(publicInquirySubmissions)
      .where(eq(publicInquirySubmissions.id, inquiryId));
    expect(inquiryRows).toHaveLength(1);
    const inquiry = inquiryRows[0]!;
    createdLeadId = inquiry.leadId;
    expect(inquiry.organizationId).toBe(organizationId);
    expect(inquiry.email).toBe('jan.testowy@example.com');
    expect(inquiry.projectType).toBe('TABLE');

    const leadRows = await external.db.select().from(leads).where(eq(leads.id, inquiry.leadId));
    expect(leadRows).toHaveLength(1);
    expect(leadRows[0]!.organizationId).toBe(organizationId);
    expect(leadRows[0]!.source).toBe('PUBLIC_WEB');

    const inquiryEvents = await external.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.organizationId, organizationId),
          eq(domainEvents.aggregateId, inquiryId),
          eq(domainEvents.eventType, 'PublicInquiryReceived'),
        ),
      );
    expect(inquiryEvents).toHaveLength(1);
    expect(JSON.stringify(inquiryEvents[0]!.payload)).not.toContain('jan.testowy@example.com');
    expect(JSON.stringify(inquiryEvents[0]!.payload)).not.toContain('+48 500 600 700');

    const intakeAudit = await external.db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, organizationId),
          eq(auditEvents.entityType, 'PublicInquirySubmission'),
          eq(auditEvents.entityId, inquiryId),
        ),
      );
    expect(intakeAudit).toHaveLength(1);
    expect(JSON.stringify(intakeAudit[0]!.afterData)).not.toContain('jan.testowy@example.com');
  });

  it('rejects the honeypot field instead of creating spam state', async () => {
    if (!inquiryKey) return;
    const response = await request(app.getHttpServer())
      .post('/public/inquiries')
      .set('x-avitus-public-inquiry-key', inquiryKey)
      .send({
        name: 'Robot',
        email: 'robot@example.com',
        projectType: 'OTHER',
        message: 'Automated submission should be rejected.',
        companyWebsite: 'https://spam.invalid',
      })
      .expect(400);
    expect(response.body.error.code).toBe('HTTP.VALIDATION_ERROR');
  });
});
