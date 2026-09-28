import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { ReadQuoteService } from '@avitus/quotes';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import type { QuoteGovernanceService } from './quote-governance.service';
import { TOKENS } from './tokens';

@Controller('quotes')
export class QuotesController {
  constructor(
    @Inject(TOKENS.quoteGovernanceService) private readonly governance: QuoteGovernanceService,
    @Inject(TOKENS.readQuoteService) private readonly readQuote: ReadQuoteService,
  ) {}

  @Post()
  create(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.governance.create(body, requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readQuote.byId(id, requireContext(request));
  }

  @Post(':id/versions')
  revise(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.governance.revise(id, body, requireContext(request));
  }

  @Post(':id/approve-discount')
  approveDiscount(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.governance.approve(id, requireContext(request));
  }

  @Post(':id/ready')
  ready(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.governance.ready(id, requireContext(request));
  }

  @Post(':id/sent')
  sent(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.governance.sent(id, requireContext(request));
  }
}
