import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { loadServerConfig } from '@avitus/config';
import { PostgresProductRepository, ReadCatalogService } from '@avitus/catalog';
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
import { createDatabase, PostgresUnitOfWork } from '@avitus/database';
import { PostgresAuditStore } from '@avitus/audit';
import { PostgresDomainEventStore } from '@avitus/events';
import { PostgresIdentityRepository } from '@avitus/iam';
import { CatalogController } from './catalog.controller';
import { ConfigurationsController } from './configurations.controller';
import { CrmController } from './crm.controller';
import { HealthController } from './health.controller';
import { OpportunitiesController } from './opportunities.controller';
import { CorrelationMiddleware, DevelopmentAuthGuard } from './request-context';
import { HttpErrorFilter } from './http-error.filter';
import { TOKENS } from './tokens';

const config = loadServerConfig();
const connection = createDatabase(config.DATABASE_URL);
const leadRepository = new PostgresLeadRepository(connection.db);
const opportunityRepository = new PostgresOpportunityRepository(connection.db);
const productRepository = new PostgresProductRepository(connection.db);
const configurationRepository = new PostgresConfigurationRepository(connection.db);
const identityRepository = new PostgresIdentityRepository(connection.db);
const uow = new PostgresUnitOfWork(connection.db);
const auditStore = new PostgresAuditStore(connection.db);
const eventStore = new PostgresDomainEventStore(connection.db);

@Module({
  controllers: [
    HealthController,
    CrmController,
    OpportunitiesController,
    CatalogController,
    ConfigurationsController,
  ],
  providers: [
    { provide: TOKENS.config, useValue: config },
    { provide: TOKENS.database, useValue: connection.db },
    { provide: TOKENS.pool, useValue: connection.pool },
    { provide: TOKENS.identityRepository, useValue: identityRepository },
    { provide: TOKENS.leadRepository, useValue: leadRepository },
    { provide: TOKENS.opportunityRepository, useValue: opportunityRepository },
    { provide: TOKENS.productRepository, useValue: productRepository },
    { provide: TOKENS.configurationRepository, useValue: configurationRepository },
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
    { provide: APP_GUARD, useClass: DevelopmentAuthGuard },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
