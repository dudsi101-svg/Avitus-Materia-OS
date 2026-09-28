import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { ConvertConfigurationRequestService, ReadConfigurationRequestService } from '@avitus/acquisition';
import type { ConfigurationRequestIdentityService } from './configuration-request-identity.service';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('configuration-requests')
export class ConfigurationRequestsController {
  constructor(
    @Inject(TOKENS.readConfigurationRequestService) private readonly readRequests: ReadConfigurationRequestService,
    @Inject(TOKENS.convertConfigurationRequestService)
    private readonly convertRequest: ConvertConfigurationRequestService,
    @Inject(TOKENS.configurationRequestIdentityService)
    private readonly identity: ConfigurationRequestIdentityService,
  ) {}

  @Get()
  list(@Req() request: AvitusRequest) {
    return this.readRequests.list(requireContext(request));
  }

  @Get(':id/identity')
  readIdentity(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.identity.read(id, requireContext(request));
  }

  @Post(':id/convert')
  convert(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.convertRequest.execute(id, body, requireContext(request));
  }

  @Post(':id/identity/link-existing')
  linkExisting(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.identity.linkExisting(id, body, requireContext(request));
  }

  @Post(':id/identity/create-person')
  createPerson(@Param('id') id: string, @Body() body: unknown, @Req() request: AvitusRequest) {
    return this.identity.createPerson(id, body, requireContext(request));
  }
}
