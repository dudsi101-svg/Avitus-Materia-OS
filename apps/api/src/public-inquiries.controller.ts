import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import type { ServerConfig } from '@avitus/config';
import type { CreatePublicInquiryService } from '@avitus/acquisition';
import { publicWebContext } from './public-web-credential';
import { PublicRoute, type AvitusRequest } from './request-context';
import { TOKENS } from './tokens';

@Controller('public/inquiries')
export class PublicInquiriesController {
  constructor(
    @Inject(TOKENS.config) private readonly config: ServerConfig,
    @Inject(TOKENS.createPublicInquiryService)
    private readonly createInquiry: CreatePublicInquiryService,
  ) {}

  @PublicRoute()
  @Post()
  async create(@Body() body: unknown, @Req() request: AvitusRequest) {
    const context = publicWebContext(this.config, request, ['acquisition.public_inquiry.create']);
    const result = await this.createInquiry.execute(body, context);
    return { ok: true, reference: result.inquiryId };
  }
}
