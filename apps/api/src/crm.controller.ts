import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { CreateLeadService, ReadLeadService } from '@avitus/crm';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('leads')
export class CrmController {
  constructor(
    @Inject(TOKENS.createLeadService) private readonly createLead: CreateLeadService,
    @Inject(TOKENS.readLeadService) private readonly readLead: ReadLeadService,
  ) {}

  @Get()
  list(@Req() request: AvitusRequest) {
    return this.readLead.list(requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readLead.byId(id, requireContext(request));
  }

  @Post()
  create(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createLead.execute(body, requireContext(request));
  }
}
