import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { CreatePriceCalculationService, ReadPriceCalculationService } from '@avitus/pricing';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('pricing/calculations')
export class PricingController {
  constructor(
    @Inject(TOKENS.createPriceCalculationService) private readonly createPriceCalculation: CreatePriceCalculationService,
    @Inject(TOKENS.readPriceCalculationService) private readonly readPriceCalculation: ReadPriceCalculationService,
  ) {}

  @Post()
  create(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createPriceCalculation.execute(body, requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readPriceCalculation.byId(id, requireContext(request));
  }
}
