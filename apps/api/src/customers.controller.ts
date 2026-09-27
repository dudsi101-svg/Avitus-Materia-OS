import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type {
  CreateCompanyCustomerService,
  CreatePersonCustomerService,
  CustomerContextService,
  LinkCustomerService,
  ReadCustomerService,
} from '@avitus/customers';
import type { AvitusRequest } from './request-context';
import { requireContext } from './request-context';
import { TOKENS } from './tokens';

@Controller('customers')
export class CustomersController {
  constructor(
    @Inject(TOKENS.createPersonCustomerService) private readonly createPerson: CreatePersonCustomerService,
    @Inject(TOKENS.createCompanyCustomerService) private readonly createCompany: CreateCompanyCustomerService,
    @Inject(TOKENS.readCustomerService) private readonly readCustomer: ReadCustomerService,
    @Inject(TOKENS.linkCustomerService) private readonly linkCustomer: LinkCustomerService,
    @Inject(TOKENS.customerContextService) private readonly customerContext: CustomerContextService,
  ) {}

  @Post('person-accounts')
  createPersonAccount(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createPerson.execute(body, requireContext(request));
  }

  @Post('company-accounts')
  createCompanyAccount(@Body() body: unknown, @Req() request: AvitusRequest) {
    return this.createCompany.execute(body, requireContext(request));
  }

  @Get()
  list(@Req() request: AvitusRequest) {
    return this.readCustomer.list(requireContext(request));
  }

  @Get('for-lead/:leadId')
  forLead(@Param('leadId') leadId: string, @Req() request: AvitusRequest) {
    return this.customerContext.forLead(leadId, requireContext(request));
  }

  @Get('for-opportunity/:opportunityId')
  forOpportunity(@Param('opportunityId') opportunityId: string, @Req() request: AvitusRequest) {
    return this.customerContext.forOpportunity(opportunityId, requireContext(request));
  }

  @Get(':id')
  byId(@Param('id') id: string, @Req() request: AvitusRequest) {
    return this.readCustomer.byId(id, requireContext(request));
  }

  @Post(':id/link/lead/:leadId')
  linkLead(
    @Param('id') id: string,
    @Param('leadId') leadId: string,
    @Req() request: AvitusRequest,
  ) {
    return this.linkCustomer.toLead(id, leadId, requireContext(request));
  }

  @Post(':id/link/opportunity/:opportunityId')
  linkOpportunity(
    @Param('id') id: string,
    @Param('opportunityId') opportunityId: string,
    @Req() request: AvitusRequest,
  ) {
    return this.linkCustomer.toOpportunity(id, opportunityId, requireContext(request));
  }
}
