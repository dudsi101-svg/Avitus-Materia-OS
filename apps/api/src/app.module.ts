import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { loadServerConfig } from '@avitus/config';
import { CreateLeadService, PostgresLeadRepository, ReadLeadService } from '@avitus/crm';
import { createDatabase, PostgresUnitOfWork } from '@avitus/database';
import { PostgresAuditStore } from '@avitus/audit';
import { PostgresDomainEventStore } from '@avitus/events';
import { PostgresIdentityRepository } from '@avitus/iam';
import { HealthController } from './health.controller';
import { CrmController } from './crm.controller';
import { CorrelationMiddleware, DevelopmentAuthGuard } from './request-context';
import { HttpErrorFilter } from './http-error.filter';
import { TOKENS } from './tokens';

const config = loadServerConfig();
const connection = createDatabase(config.DATABASE_URL);
const leadRepository = new PostgresLeadRepository(connection.db);
const identityRepository = new PostgresIdentityRepository(connection.db);
const uow = new PostgresUnitOfWork(connection.db);
const auditStore = new PostgresAuditStore(connection.db);
const eventStore = new PostgresDomainEventStore(connection.db);

@Module({
  controllers: [HealthController, CrmController],
  providers: [
    { provide: TOKENS.config, useValue: config },
    { provide: TOKENS.database, useValue: connection.db },
    { provide: TOKENS.pool, useValue: connection.pool },
    { provide: TOKENS.identityRepository, useValue: identityRepository },
    { provide: TOKENS.leadRepository, useValue: leadRepository },
    {
      provide: TOKENS.createLeadService,
      useValue: new CreateLeadService(uow, leadRepository, eventStore, auditStore),
    },
    { provide: TOKENS.readLeadService, useValue: new ReadLeadService(leadRepository) },
    { provide: APP_GUARD, useClass: DevelopmentAuthGuard },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
