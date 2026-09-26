import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { CreateOpportunityService, ReadOpportunityService } from '@avitus/crm';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    @Inject(TOKENS.createOpportunityService) private readonly createOpportunity: CreateOpportunityService,
    @Inject(TOKENS.readOpportunityService) private readonly readOpportunity: ReadOpportunityService,
  ) {}

  @Get()
  list(@Req() request: AvitusRequest) {
    return this.readOpportunity.list(requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readOpportunity.byId(id, requireContext(request));
  }

  @Post()
  create(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createOpportunity.execute(body, requireContext(request));
  }
}
