import { timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ServerConfig } from '@avitus/config';
import type { CreatePublicInquiryService } from '@avitus/acquisition';
import type { RequestContext } from '@avitus/shared';
import { PublicRoute, type AvitusRequest } from './request-context';
import { TOKENS } from './tokens';

const PUBLIC_WEB_ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function secretsMatch(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

@Controller('public/inquiries')
export class PublicInquiriesController {
  constructor(
    @Inject(TOKENS.config) private readonly config: ServerConfig,
    @Inject(TOKENS.createPublicInquiryService) private readonly createInquiry: CreatePublicInquiryService,
  ) {}

  @PublicRoute()
  @Post()
  async create(@Body() body: unknown, @Req() request: AvitusRequest) {
    const organizationId = this.config.PUBLIC_INQUIRY_ORGANIZATION_ID;
    const expectedKey = this.config.PUBLIC_INQUIRY_API_KEY;
    if (!organizationId || !expectedKey) {
      throw new ServiceUnavailableException('Public inquiry intake is not configured.');
    }
    if (!secretsMatch(request.header('x-avitus-public-inquiry-key'), expectedKey)) {
      throw new UnauthorizedException('Invalid public inquiry credential.');
    }

    const context: RequestContext = {
      correlationId: request.correlationId ?? crypto.randomUUID(),
      organizationId,
      actor: { type: 'INTEGRATION', id: PUBLIC_WEB_ACTOR_ID },
      permissions: new Set(['acquisition.public_inquiry.create']),
    };
    const result = await this.createInquiry.execute(body, context);
    return { ok: true, reference: result.inquiryId };
  }
}
