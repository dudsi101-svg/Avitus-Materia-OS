import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { Product, ProductOptionDefinition, ProductRepository } from '@avitus/catalog';
import type { OpportunityRepository } from '@avitus/crm';
import {
  configurationVersions,
  configurations,
  executorFrom,
  type DbExecutor,
} from '@avitus/database';
import type { DomainEventStore } from '@avitus/events';
import {
  DomainError,
  newDomainEvent,
  type RequestContext,
  type TransactionContext,
  type UnitOfWork,
} from '@avitus/shared';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';

export type ConfigurationStatus =
  | 'DRAFT'
  | 'INCOMPLETE'
  | 'READY_FOR_PRICING'
  | 'PRICED'
  | 'CUSTOMER_REVIEW'
  | 'APPROVED'
  | 'LOCKED'
  | 'SUPERSEDED'
  | 'ARCHIVED';

export interface Configuration {
  id: string;
  organizationId: string;
  opportunityId: string;
  productId: string;
  status: ConfigurationStatus;
  currentVersion: number;
  createdByUserId?: string;
  createdByAi: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigurationVersion {
  id: string;
  organizationId: string;
  configurationId: string;
  versionNumber: number;
  configurationData: Record<string, unknown>;
  readinessIssues: string[];
  createdByUserId?: string;
  createdByAi: boolean;
  reason?: string;
  createdAt: Date;
}

export interface ConfigurationDetail extends Configuration {
  versions: ConfigurationVersion[];
}

export interface ConfigurationRepository {
  insert(configuration: Configuration, version: ConfigurationVersion, tx?: TransactionContext): Promise<void>;
  appendVersion(
    configuration: Configuration,
    version: ConfigurationVersion,
    tx?: TransactionContext,
  ): Promise<void>;
  findById(organizationId: string, configurationId: string): Promise<Configuration | null>;
  listVersions(organizationId: string, configurationId: string): Promise<ConfigurationVersion[]>;
}

function rowToConfiguration(row: typeof configurations.$inferSelect): Configuration {
  return {
    id: row.id,
    organizationId: row.organizationId,
    opportunityId: row.opportunityId,
    productId: row.productId,
    status: row.status,
    currentVersion: row.currentVersion,
    ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
    createdByAi: row.createdByAi,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToVersion(row: typeof configurationVersions.$inferSelect): ConfigurationVersion {
  const data = row.configurationData;
  const issues = row.readinessIssues;
  return {
    id: row.id,
    organizationId: row.organizationId,
    configurationId: row.configurationId,
    versionNumber: row.versionNumber,
    configurationData:
      data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {},
    readinessIssues: Array.isArray(issues)
      ? issues.filter((issue): issue is string => typeof issue === 'string')
      : [],
    ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
    createdByAi: row.createdByAi,
    ...(row.reason ? { reason: row.reason } : {}),
    createdAt: row.createdAt,
  };
}

export class PostgresConfigurationRepository implements ConfigurationRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(configuration: Configuration, version: ConfigurationVersion, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(configurations).values({
      id: configuration.id,
      organizationId: configuration.organizationId,
      opportunityId: configuration.opportunityId,
      productId: configuration.productId,
      status: configuration.status,
      currentVersion: configuration.currentVersion,
      createdByUserId: configuration.createdByUserId,
      createdByAi: configuration.createdByAi,
      createdAt: configuration.createdAt,
      updatedAt: configuration.updatedAt,
    });
    await executor.insert(configurationVersions).values({
      id: version.id,
      organizationId: version.organizationId,
      configurationId: version.configurationId,
      versionNumber: version.versionNumber,
      configurationData: version.configurationData,
      readinessIssues: version.readinessIssues,
      createdByUserId: version.createdByUserId,
      createdByAi: version.createdByAi,
      reason: version.reason,
      createdAt: version.createdAt,
    });
  }

  async appendVersion(
    configuration: Configuration,
    version: ConfigurationVersion,
    tx?: TransactionContext,
  ): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor
      .update(configurations)
      .set({
        status: configuration.status,
        currentVersion: configuration.currentVersion,
        updatedAt: configuration.updatedAt,
      })
      .where(
        and(
          eq(configurations.organizationId, configuration.organizationId),
          eq(configurations.id, configuration.id),
        ),
      );
    await executor.insert(configurationVersions).values({
      id: version.id,
      organizationId: version.organizationId,
      configurationId: version.configurationId,
      versionNumber: version.versionNumber,
      configurationData: version.configurationData,
      readinessIssues: version.readinessIssues,
      createdByUserId: version.createdByUserId,
      createdByAi: version.createdByAi,
      reason: version.reason,
      createdAt: version.createdAt,
    });
  }

  async findById(organizationId: string, configurationId: string): Promise<Configuration | null> {
    const rows = await this.db
      .select()
      .from(configurations)
      .where(and(eq(configurations.organizationId, organizationId), eq(configurations.id, configurationId)))
      .limit(1);
    return rows[0] ? rowToConfiguration(rows[0]) : null;
  }

  async listVersions(organizationId: string, configurationId: string): Promise<ConfigurationVersion[]> {
    const rows = await this.db
      .select()
      .from(configurationVersions)
      .where(
        and(
          eq(configurationVersions.organizationId, organizationId),
          eq(configurationVersions.configurationId, configurationId),
        ),
      )
      .orderBy(asc(configurationVersions.versionNumber));
    return rows.map(rowToVersion);
  }
}

export const createConfigurationSchema = z.object({
  opportunityId: z.string().uuid(),
  productId: z.string().uuid(),
  configurationData: z.record(z.string(), z.unknown()).default({}),
  reason: z.string().trim().max(2000).optional(),
});

export const reviseConfigurationSchema = z.object({
  configurationData: z.record(z.string(), z.unknown()),
  reason: z.string().trim().min(1).max(2000),
});

function validateValue(option: ProductOptionDefinition, value: unknown): void {
  if (option.dataType === 'NUMBER') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new DomainError('CONFIGURATION.INVALID_OPTION_VALUE', `${option.code} must be a number.`);
    }
    if (option.minValue !== undefined && value < Number(option.minValue)) {
      throw new DomainError('CONFIGURATION.OPTION_BELOW_MIN', `${option.code} is below its minimum.`);
    }
    if (option.maxValue !== undefined && value > Number(option.maxValue)) {
      throw new DomainError('CONFIGURATION.OPTION_ABOVE_MAX', `${option.code} is above its maximum.`);
    }
    return;
  }
  if (option.dataType === 'TEXT') {
    if (typeof value !== 'string') {
      throw new DomainError('CONFIGURATION.INVALID_OPTION_VALUE', `${option.code} must be text.`);
    }
    return;
  }
  if (option.dataType === 'BOOLEAN') {
    if (typeof value !== 'boolean') {
      throw new DomainError('CONFIGURATION.INVALID_OPTION_VALUE', `${option.code} must be boolean.`);
    }
    return;
  }
  if (option.dataType === 'ENUM') {
    if (typeof value !== 'string' || !option.choices?.includes(value)) {
      throw new DomainError('CONFIGURATION.INVALID_ENUM_VALUE', `${option.code} has an unsupported value.`, {
        allowed: option.choices ?? [],
      });
    }
  }
}

export function assessConfiguration(
  product: Product,
  data: Record<string, unknown>,
): { status: 'INCOMPLETE' | 'READY_FOR_PRICING'; readinessIssues: string[] } {
  const byCode = new Map(product.options.map((option) => [option.code, option]));
  for (const [code, value] of Object.entries(data)) {
    const option = byCode.get(code);
    if (!option) {
      throw new DomainError('CONFIGURATION.UNKNOWN_OPTION', `Unknown product option: ${code}.`);
    }
    validateValue(option, value);
  }
  const readinessIssues = product.options
    .filter((option) => option.required && !(option.code in data))
    .map((option) => `REQUIRED:${option.code}`);
  return {
    status: readinessIssues.length === 0 ? 'READY_FOR_PRICING' : 'INCOMPLETE',
    readinessIssues,
  };
}

export class CreateConfigurationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly opportunities: OpportunityRepository,
    private readonly products: ProductRepository,
    private readonly configurations: ConfigurationRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<ConfigurationDetail> {
    if (!context.permissions.has('configurator.configuration.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing configurator.configuration.write permission.');
    }
    const input = createConfigurationSchema.parse(rawInput);
    const opportunity = await this.opportunities.findById(context.organizationId, input.opportunityId);
    if (!opportunity) {
      throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found in this organization.');
    }
    const product = await this.products.findActiveById(context.organizationId, input.productId);
    if (!product) throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found in this organization.');

    const assessment = assessConfiguration(product, input.configurationData);
    const now = new Date();
    const configuration: Configuration = {
      id: randomUUID(),
      organizationId: context.organizationId,
      opportunityId: input.opportunityId,
      productId: input.productId,
      status: assessment.status,
      currentVersion: 1,
      ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
      createdByAi: context.actor.type === 'AI_AGENT',
      createdAt: now,
      updatedAt: now,
    };
    const version: ConfigurationVersion = {
      id: randomUUID(),
      organizationId: context.organizationId,
      configurationId: configuration.id,
      versionNumber: 1,
      configurationData: input.configurationData,
      readinessIssues: assessment.readinessIssues,
      ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
      createdByAi: context.actor.type === 'AI_AGENT',
      ...(input.reason ? { reason: input.reason } : {}),
      createdAt: now,
    };
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'ConfigurationCreated',
      aggregateType: 'Configuration',
      aggregateId: configuration.id,
      payload: {
        configurationId: configuration.id,
        opportunityId: configuration.opportunityId,
        productId: configuration.productId,
        versionNumber: 1,
        status: configuration.status,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.configurations.insert(configuration, version, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Configuration',
          entityId: configuration.id,
          action: 'CREATE',
          afterData: {
            opportunityId: configuration.opportunityId,
            productId: configuration.productId,
            versionNumber: 1,
            status: configuration.status,
            readinessIssues: version.readinessIssues,
          },
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    return { ...configuration, versions: [version] };
  }
}

export class ReviseConfigurationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly products: ProductRepository,
    private readonly configurations: ConfigurationRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(configurationId: string, rawInput: unknown, context: RequestContext): Promise<ConfigurationDetail> {
    if (!context.permissions.has('configurator.configuration.write')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing configurator.configuration.write permission.');
    }
    const input = reviseConfigurationSchema.parse(rawInput);
    const current = await this.configurations.findById(context.organizationId, configurationId);
    if (!current) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    if (['LOCKED', 'SUPERSEDED', 'ARCHIVED'].includes(current.status)) {
      throw new DomainError('CONFIGURATION.IMMUTABLE', 'This configuration cannot be revised.');
    }
    const product = await this.products.findActiveById(context.organizationId, current.productId);
    if (!product) throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found.');
    const assessment = assessConfiguration(product, input.configurationData);
    const now = new Date();
    const next: Configuration = {
      ...current,
      status: assessment.status,
      currentVersion: current.currentVersion + 1,
      updatedAt: now,
    };
    const version: ConfigurationVersion = {
      id: randomUUID(),
      organizationId: context.organizationId,
      configurationId,
      versionNumber: next.currentVersion,
      configurationData: input.configurationData,
      readinessIssues: assessment.readinessIssues,
      ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
      createdByAi: context.actor.type === 'AI_AGENT',
      reason: input.reason,
      createdAt: now,
    };
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'ConfigurationVersionCreated',
      aggregateType: 'Configuration',
      aggregateId: configurationId,
      payload: {
        configurationId,
        versionNumber: next.currentVersion,
        previousVersionNumber: current.currentVersion,
        status: next.status,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.configurations.appendVersion(next, version, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Configuration',
          entityId: configurationId,
          action: 'REVISE',
          beforeData: { versionNumber: current.currentVersion, status: current.status },
          afterData: {
            versionNumber: next.currentVersion,
            status: next.status,
            readinessIssues: version.readinessIssues,
          },
          reason: input.reason,
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    return { ...next, versions: await this.configurations.listVersions(context.organizationId, configurationId) };
  }
}

export class ReadConfigurationService {
  constructor(private readonly configurations: ConfigurationRepository) {}

  async byId(configurationId: string, context: RequestContext): Promise<ConfigurationDetail> {
    if (!context.permissions.has('configurator.configuration.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing configurator.configuration.read permission.');
    }
    const configuration = await this.configurations.findById(context.organizationId, configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    const versions = await this.configurations.listVersions(context.organizationId, configurationId);
    return { ...configuration, versions };
  }
}
