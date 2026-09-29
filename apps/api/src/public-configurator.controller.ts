import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import type { CreatePublicConfigurationRequestService } from '@avitus/acquisition';
import type { ReadPublicCatalogService } from '@avitus/catalog';
import type { ServerConfig } from '@avitus/config';
import { publicWebContext } from './public-web-credential';
import { PublicRoute, type AvitusRequest } from './request-context';
import { TOKENS } from './tokens';
import type { PublicIntakeBudgetService } from './public-intake-budget.service';

@Controller('public/configurator')
export class PublicConfiguratorController {
  constructor(
    @Inject(TOKENS.config) private readonly config: ServerConfig,
    @Inject(TOKENS.readPublicCatalogService) private readonly catalog: ReadPublicCatalogService,
    @Inject(TOKENS.createPublicConfigurationRequestService)
    private readonly createRequest: CreatePublicConfigurationRequestService,
    @Inject(TOKENS.publicIntakeBudget) private readonly intakeBudget: PublicIntakeBudgetService,
  ) {}

  @PublicRoute()
  @Get('products')
  async products(@Req() request: AvitusRequest) {
    const context = publicWebContext(this.config, request, ['catalog.public_product.read']);
    return { products: await this.catalog.listConfigurable(context) };
  }

  @PublicRoute()
  @Post('requests')
  async create(@Body() body: unknown, @Req() request: AvitusRequest) {
    const context = publicWebContext(this.config, request, [
      'acquisition.public_configuration_request.create',
    ]);
    await this.intakeBudget.consume(context.organizationId);
    const result = await this.createRequest.execute(body, context);
    return {
      ok: true,
      reference: result.requestId,
      configurationStatus: result.configurationStatus,
    };
  }
}
