import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import {
  CreatePublicConfigurationRequestService,
  CreatePublicInquiryService,
  PostgresPublicConfigurationRequestRepository,
  PostgresPublicInquiryRepository,
} from '@avitus/acquisition';
import { loadServerConfig } from '@avitus/config';
import { PostgresProductRepository, ReadCatalogService, ReadPublicCatalogService } from '@avitus/catalog';
import {
  CreateConfigurationService,
  PostgresConfigurationRepository,
  ReadConfigurationService,
  ReviseConfigurationService,
} from '@avitus/configurator';
import {
  CreateLeadService,
  CreateOpportunityService,
  PostgresLeadRepository,
  PostgresOpportunityRepository,
  ReadLeadService,
  ReadOpportunityService,
} from '@avitus/crm';
import {
  CreateCompanyCustomerService,
  CreatePersonCustomerService,
  CustomerContextService,
  LinkCustomerService,
  PostgresCustomerAccountRepository,
  PostgresCustomerLinkRepository,
  ReadCustomerService,
} from '@avitus/customers';
import { createDatabase, PostgresUnitOfWork } from '@avitus/database';
import { PostgresAuditStore } from '@avitus/audit';
import { PostgresDomainEventStore } from '@avitus/events';
import { PostgresIdentityRepository } from '@avitus/iam';
import {
  CreatePriceCalculationService,
  PostgresPriceCalculationRepository,
  ReadPriceCalculationService,
} from '@avitus/pricing';
import {
  CreateQuoteService,
  PostgresQuoteRepository,
  ReadQuoteService,
  ReviseQuoteService,
} from '@avitus/quotes';
import { CatalogController } from './catalog.controller';
import { ConfigurationsController } from './configurations.controller';
import { CrmController } from './crm.controller';
import { CustomersController } from './customers.controller';
import { HealthController } from './health.controller';
import { OpportunitiesController } from './opportunities.controller';
import { PricingController } from './pricing.controller';
import { PublicConfiguratorController } from './public-configurator.controller';
import { PublicInquiriesController } from './public-inquiries.controller';
import { QuotesController } from './quotes.controller';
import { CorrelationMiddleware, DevelopmentAuthGuard } from './request-context';
import { HttpErrorFilter } from './http-error.filter';
import { TOKENS } from './tokens';

const config = loadServerConfig();
const connection = createDatabase(config.DATABASE_URL);
const leadRepository = new PostgresLeadRepository(connection.db);
const publicInquiryRepository = new PostgresPublicInquiryRepository(connection.db);
const publicConfigurationRequestRepository = new PostgresPublicConfigurationRequestRepository(connection.db);
const opportunityRepository = new PostgresOpportunityRepository(connection.db);
const productRepository = new PostgresProductRepository(connection.db);
const configurationRepository = new PostgresConfigurationRepository(connection.db);
const priceCalculationRepository = new PostgresPriceCalculationRepository(connection.db);
const quoteRepository = new PostgresQuoteRepository(connection.db);
const customerAccountRepository = new PostgresCustomerAccountRepository(connection.db);
const customerLinkRepository = new PostgresCustomerLinkRepository(connection.db);
const identityRepository = new PostgresIdentityRepository(connection.db);
const uow = new PostgresUnitOfWork(connection.db);
const auditStore = new PostgresAuditStore(connection.db);
const eventStore = new PostgresDomainEventStore(connection.db);

@Module({
  controllers: [
    HealthController,
    PublicInquiriesController,
    PublicConfiguratorController,
    CrmController,
    OpportunitiesController,
    CustomersController,
    CatalogController,
    ConfigurationsController,
    PricingController,
    QuotesController,
  ],
  providers: [
    { provide: TOKENS.config, useValue: config },
    { provide: TOKENS.database, useValue: connection.db },
    { provide: TOKENS.pool, useValue: connection.pool },
    { provide: TOKENS.identityRepository, useValue: identityRepository },
    { provide: TOKENS.leadRepository, useValue: leadRepository },
    { provide: TOKENS.publicInquiryRepository, useValue: publicInquiryRepository },
    { provide: TOKENS.opportunityRepository, useValue: opportunityRepository },
    { provide: TOKENS.productRepository, useValue: productRepository },
    { provide: TOKENS.configurationRepository, useValue: configurationRepository },
    { provide: TOKENS.priceCalculationRepository, useValue: priceCalculationRepository },
    { provide: TOKENS.quoteRepository, useValue: quoteRepository },
    { provide: TOKENS.customerAccountRepository, useValue: customerAccountRepository },
    { provide: TOKENS.customerLinkRepository, useValue: customerLinkRepository },
    {
      provide: TOKENS.createPublicInquiryService,
      useValue: new CreatePublicInquiryService(
        uow,
        leadRepository,
        publicInquiryRepository,
        eventStore,
        auditStore,
      ),
    },
    { provide: TOKENS.publicConfigurationRequestRepository, useValue: publicConfigurationRequestRepository },
    {
      provide: TOKENS.createPublicConfigurationRequestService,
      useValue: new CreatePublicConfigurationRequestService(
        uow,
        productRepository,
        leadRepository,
        publicConfigurationRequestRepository,
        eventStore,
        auditStore,
      ),
    },
    { provide: TOKENS.readPublicCatalogService, useValue: new ReadPublicCatalogService(productRepository) },
    {
      provide: TOKENS.createLeadService,
      useValue: new CreateLeadService(uow, leadRepository, eventStore, auditStore),
    },
    { provide: TOKENS.readLeadService, useValue: new ReadLeadService(leadRepository) },
    {
      provide: TOKENS.createOpportunityService,
      useValue: new CreateOpportunityService(
        uow,
        leadRepository,
        opportunityRepository,
        eventStore,
        auditStore,
      ),
    },
    {
      provide: TOKENS.readOpportunityService,
      useValue: new ReadOpportunityService(opportunityRepository),
    },
    {
      provide: TOKENS.createPersonCustomerService,
      useValue: new CreatePersonCustomerService(uow, customerAccountRepository, eventStore, auditStore),
    },
    {
      provide: TOKENS.createCompanyCustomerService,
      useValue: new CreateCompanyCustomerService(uow, customerAccountRepository, eventStore, auditStore),
    },
    { provide: TOKENS.readCustomerService, useValue: new ReadCustomerService(customerAccountRepository) },
    {
      provide: TOKENS.linkCustomerService,
      useValue: new LinkCustomerService(
        uow,
        customerAccountRepository,
        customerLinkRepository,
        leadRepository,
        opportunityRepository,
        eventStore,
        auditStore,
      ),
    },
    {
      provide: TOKENS.customerContextService,
      useValue: new CustomerContextService(customerAccountRepository, customerLinkRepository),
    },
    { provide: TOKENS.readCatalogService, useValue: new ReadCatalogService(productRepository) },
    {
      provide: TOKENS.createConfigurationService,
      useValue: new CreateConfigurationService(
        uow,
        opportunityRepository,
        productRepository,
        configurationRepository,
        eventStore,
        auditStore,
      ),
    },
    {
      provide: TOKENS.reviseConfigurationService,
      useValue: new ReviseConfigurationService(
        uow,
        productRepository,
        configurationRepository,
        eventStore,
        auditStore,
      ),
    },
    {
      provide: TOKENS.readConfigurationService,
      useValue: new ReadConfigurationService(configurationRepository),
    },
    {
      provide: TOKENS.createPriceCalculationService,
      useValue: new CreatePriceCalculationService(
        uow,
        configurationRepository,
        priceCalculationRepository,
        eventStore,
        auditStore,
      ),
    },
    {
      provide: TOKENS.readPriceCalculationService,
      useValue: new ReadPriceCalculationService(priceCalculationRepository),
    },
    {
      provide: TOKENS.createQuoteService,
      useValue: new CreateQuoteService(
        uow,
        opportunityRepository,
        configurationRepository,
        productRepository,
        priceCalculationRepository,
        quoteRepository,
        eventStore,
        auditStore,
      ),
    },
    {
      provide: TOKENS.reviseQuoteService,
      useValue: new ReviseQuoteService(
        uow,
        configurationRepository,
        productRepository,
        priceCalculationRepository,
        quoteRepository,
        eventStore,
        auditStore,
      ),
    },
    { provide: TOKENS.readQuoteService, useValue: new ReadQuoteService(quoteRepository) },
    { provide: APP_GUARD, useClass: DevelopmentAuthGuard },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
