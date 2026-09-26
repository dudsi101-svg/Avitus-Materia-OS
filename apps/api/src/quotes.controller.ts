import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { CreateQuoteService, ReadQuoteService, ReviseQuoteService } from '@avitus/quotes';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('quotes')
export class QuotesController {
  constructor(
    @Inject(TOKENS.createQuoteService) private readonly createQuote: CreateQuoteService,
    @Inject(TOKENS.reviseQuoteService) private readonly reviseQuote: ReviseQuoteService,
    @Inject(TOKENS.readQuoteService) private readonly readQuote: ReadQuoteService,
  ) {}

  @Post()
  create(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createQuote.execute(body, requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readQuote.byId(id, requireContext(request));
  }

  @Post(':id/versions')
  revise(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.reviseQuote.execute(id, body, requireContext(request));
  }
}
