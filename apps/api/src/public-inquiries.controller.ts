import { Body, Controller, Inject, Post, Req } from '@nestjs/common';
import type { ServerConfig } from '@avitus/config';
import type { CreatePublicInquiryService } from '@avitus/acquisition';
import { publicWebContext } from './public-web-credential';
import { PublicRoute, type AvitusRequest } from './request-context';
import { TOKENS } from './tokens';
import type { PublicIntakeBudgetService } from './public-intake-budget.service';

@Controller('public/inquiries')
export class PublicInquiriesController {
  constructor(
    @Inject(TOKENS.config) private readonly config: ServerConfig,
    @Inject(TOKENS.createPublicInquiryService)
    private readonly createInquiry: CreatePublicInquiryService,
    @Inject(TOKENS.publicIntakeBudget) private readonly intakeBudget: PublicIntakeBudgetService,
  ) {}

  @PublicRoute()
  @Post()
  async create(@Body() body: unknown, @Req() request: AvitusRequest) {
    const context = publicWebContext(this.config, request, ['acquisition.public_inquiry.create']);
    await this.intakeBudget.consume(context.organizationId);
    const result = await this.createInquiry.execute(body, context);
    return { ok: true, reference: result.inquiryId };
  }
}
