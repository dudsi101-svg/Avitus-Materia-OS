import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { ReadCatalogService } from '@avitus/catalog';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('catalog/products')
export class CatalogController {
  constructor(@Inject(TOKENS.readCatalogService) private readonly catalog: ReadCatalogService) {}

  @Get()
  list(@Req() request: AvitusRequest) {
    return this.catalog.listProducts(requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.catalog.productById(id, requireContext(request));
  }
}
