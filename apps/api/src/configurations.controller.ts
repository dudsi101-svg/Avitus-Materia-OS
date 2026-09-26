import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type {
  CreateConfigurationService,
  ReadConfigurationService,
  ReviseConfigurationService,
} from '@avitus/configurator';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('configurations')
export class ConfigurationsController {
  constructor(
    @Inject(TOKENS.createConfigurationService) private readonly createConfiguration: CreateConfigurationService,
    @Inject(TOKENS.reviseConfigurationService) private readonly reviseConfiguration: ReviseConfigurationService,
    @Inject(TOKENS.readConfigurationService) private readonly readConfiguration: ReadConfigurationService,
  ) {}

  @Post()
  create(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createConfiguration.execute(body, requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readConfiguration.byId(id, requireContext(request));
  }

  @Post(':id/versions')
  revise(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.reviseConfiguration.execute(id, body, requireContext(request));
  }
}
