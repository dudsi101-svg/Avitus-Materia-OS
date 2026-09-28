import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { ConvertConfigurationRequestService, ReadConfigurationRequestService } from '@avitus/acquisition';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('configuration-requests')
export class ConfigurationRequestsController {
  constructor(
    @Inject(TOKENS.readConfigurationRequestService) private readonly readRequests: ReadConfigurationRequestService,
    @Inject(TOKENS.convertConfigurationRequestService)
    private readonly convertRequest: ConvertConfigurationRequestService,
  ) {}

  @Get()
  list(@Req() request: AvitusRequest) {
    return this.readRequests.list(requireContext(request));
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.convertRequest.execute(id, body, requireContext(request));
  }
}
