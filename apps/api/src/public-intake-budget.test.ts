import 'reflect-metadata';
import { type INestApplication, Module } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicIntakeBudgetService } from './public-intake-budget.service';
import { PublicInquiriesController } from './public-inquiries.controller';
import { PublicConfiguratorController } from './public-configurator.controller';
import { HttpErrorFilter } from './http-error.filter';
import { TOKENS } from './tokens';

const consume = vi.fn();
const submitInquiry = vi.fn(async () => ({ inquiryId: 'inquiry' }));
const submitConfiguration = vi.fn(async () => ({ requestId: 'configuration', configurationStatus: 'INCOMPLETE' }));
const key = 'test-public-intake-key-not-a-real-secret';
const organizationId = '22222222-2222-4222-8222-222222222222';

@Module({
  controllers: [PublicInquiriesController, PublicConfiguratorController],
  providers: [
    { provide: TOKENS.config, useValue: { PUBLIC_INQUIRY_API_KEY: key, PUBLIC_INQUIRY_ORGANIZATION_ID: organizationId } },
    { provide: TOKENS.publicIntakeBudget, useValue: new PublicIntakeBudgetService({ consume }, 2) },
    { provide: TOKENS.createPublicInquiryService, useValue: { execute: submitInquiry } },
    { provide: TOKENS.createPublicConfigurationRequestService, useValue: { execute: submitConfiguration } },
    { provide: TOKENS.readPublicCatalogService, useValue: { listConfigurable: async () => [] } },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
class TestModule {}

describe('Public intake HTTP budget boundary', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await NestFactory.create(TestModule, { logger: false }); await app.init(); });
  afterAll(async () => { await app.close(); });
  beforeEach(() => { consume.mockReset(); submitInquiry.mockClear(); submitConfiguration.mockClear(); });

  it('shares one org budget across both writes, returning 429 + Retry-After before business writes', async () => {
    consume.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    await request(app.getHttpServer()).post('/public/inquiries').set('x-avitus-public-inquiry-key', key).send({}).expect(201);
    await request(app.getHttpServer()).post('/public/configurator/requests').set('x-avitus-public-inquiry-key', key).send({}).expect(201);
    for (const path of ['/public/inquiries', '/public/configurator/requests']) {
      const response = await request(app.getHttpServer()).post(path).set('x-avitus-public-inquiry-key', key).send({ organizationId: 'attacker-controlled' }).expect(429);
      expect(response.headers['retry-after']).toBe('60');
    }
    expect(consume.mock.calls).toEqual(Array(4).fill([organizationId, 2]));
    expect(submitInquiry).toHaveBeenCalledTimes(1);
    expect(submitConfiguration).toHaveBeenCalledTimes(1);
  });

  it('checks credentials before consuming and does not throttle catalog reads', async () => {
    for (const path of ['/public/inquiries', '/public/configurator/requests']) {
      await request(app.getHttpServer()).post(path).set('x-avitus-public-inquiry-key', 'wrong').send({}).expect(401);
    }
    await request(app.getHttpServer()).get('/public/configurator/products').set('x-avitus-public-inquiry-key', key).expect(200);
    expect(consume).not.toHaveBeenCalled();
    expect(submitInquiry).not.toHaveBeenCalled();
    expect(submitConfiguration).not.toHaveBeenCalled();
  });

  it('fails closed with a safe 503 when the shared store is unavailable', async () => {
    consume.mockRejectedValue(new Error('postgres://private-password; customer@example.com'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app.getHttpServer()).post('/public/inquiries').set('x-avitus-public-inquiry-key', key).send({}).expect(503);
      expect(JSON.stringify(response.body)).not.toContain('private-password');
      expect(JSON.stringify(log.mock.calls)).not.toContain('customer@example.com');
      expect(submitInquiry).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });
});
