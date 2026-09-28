import { Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type {
  AcceptQuoteService,
  CreateOrderFromAcceptedQuoteService,
  ReadOrderService,
  ReadProjectService,
} from './order-flow';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller()
export class OrdersController {
  constructor(
    @Inject(TOKENS.acceptQuoteService) private readonly acceptQuote: AcceptQuoteService,
    @Inject(TOKENS.createOrderFromAcceptedQuoteService)
    private readonly createOrderFromAcceptedQuote: CreateOrderFromAcceptedQuoteService,
    @Inject(TOKENS.readOrderService) private readonly readOrder: ReadOrderService,
    @Inject(TOKENS.readProjectService) private readonly readProject: ReadProjectService,
  ) {}

  @Post('quotes/:id/accept')
  accept(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.acceptQuote.execute(id, requireContext(request));
  }

  @Post('quotes/:id/create-order')
  createOrder(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.createOrderFromAcceptedQuote.execute(id, requireContext(request));
  }

  @Get('orders/:id')
  orderById(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readOrder.byId(id, requireContext(request));
  }

  @Get('projects/:id')
  projectById(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readProject.byId(id, requireContext(request));
  }
}
