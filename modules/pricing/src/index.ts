import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { ConfigurationRepository } from '@avitus/configurator';
import {
  costComponents,
  executorFrom,
  priceCalculations,
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

const MONEY_PATTERN = /^(0|[1-9]\d*)(\.\d{1,4})?$/;
const SCALE = 10_000n;
export const PRICING_ALGORITHM_VERSION = 'cost-plus-margin-v1';

export type CostComponentType =
  | 'MATERIAL'
  | 'LABOR'
  | 'MACHINE'
  | 'OUTSOURCING'
  | 'TRANSPORT'
  | 'PACKAGING'
  | 'FINISH'
  | 'OTHER';

export interface CostComponent {
  id: string;
  organizationId: string;
  priceCalculationId: string;
  componentType: CostComponentType;
  label: string;
  amount: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface PriceCalculation {
  id: string;
  organizationId: string;
  configurationId: string;
  configurationVersionId: string;
  configurationVersionNumber: number;
  currency: string;
  algorithmVersion: string;
  targetMarginBps: number;
  totalCost: string;
  recommendedPrice: string;
  inputSnapshot: Record<string, unknown>;
  outputSnapshot: Record<string, unknown>;
  createdByUserId?: string;
  createdByAi: boolean;
  createdAt: Date;
}

export interface PriceCalculationDetail extends PriceCalculation {
  components: CostComponent[];
}

export interface PriceCalculationRepository {
  insert(
    calculation: PriceCalculation,
    components: CostComponent[],
    tx?: TransactionContext,
  ): Promise<void>;
  findById(organizationId: string, calculationId: string): Promise<PriceCalculationDetail | null>;
}

export function parseMoneyUnits(value: string): bigint {
  if (!MONEY_PATTERN.test(value)) {
    throw new DomainError(
      'PRICING.INVALID_MONEY',
      'Money must be a non-negative decimal string with at most four decimal places.',
    );
  }
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * SCALE + BigInt(fraction.padEnd(4, '0'));
}

export function formatMoneyUnits(units: bigint): string {
  if (units < 0n) throw new DomainError('PRICING.INVALID_MONEY', 'Money cannot be negative.');
  const whole = units / SCALE;
  const fraction = (units % SCALE).toString().padStart(4, '0');
  return `${whole}.${fraction}`;
}

export function subtractMoney(left: string, right: string): string {
  const result = parseMoneyUnits(left) - parseMoneyUnits(right);
  if (result < 0n) throw new DomainError('PRICING.NEGATIVE_RESULT', 'Money subtraction became negative.');
  return formatMoneyUnits(result);
}

function ceilDivide(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - 1n) / denominator;
}

export function calculatePrice(
  components: ReadonlyArray<{ amount: string }>,
  targetMarginBps: number,
): { totalCost: string; recommendedPrice: string } {
  if (!Number.isInteger(targetMarginBps) || targetMarginBps < 0 || targetMarginBps >= 10_000) {
    throw new DomainError('PRICING.INVALID_MARGIN', 'Target margin must be an integer from 0 to 9999 basis points.');
  }
  const totalUnits = components.reduce((sum, component) => sum + parseMoneyUnits(component.amount), 0n);
  const denominator = BigInt(10_000 - targetMarginBps);
  const recommendedUnits = totalUnits === 0n ? 0n : ceilDivide(totalUnits * 10_000n, denominator);
  return {
    totalCost: formatMoneyUnits(totalUnits),
    recommendedPrice: formatMoneyUnits(recommendedUnits),
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function calculationFromRow(row: typeof priceCalculations.$inferSelect): PriceCalculation {
  return {
    id: row.id,
    organizationId: row.organizationId,
    configurationId: row.configurationId,
    configurationVersionId: row.configurationVersionId,
    configurationVersionNumber: row.configurationVersionNumber,
    currency: row.currency,
    algorithmVersion: row.algorithmVersion,
    targetMarginBps: row.targetMarginBps,
    totalCost: row.totalCost,
    recommendedPrice: row.recommendedPrice,
    inputSnapshot: jsonObject(row.inputSnapshot),
    outputSnapshot: jsonObject(row.outputSnapshot),
    ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
    createdByAi: row.createdByAi,
    createdAt: row.createdAt,
  };
}

function componentFromRow(row: typeof costComponents.$inferSelect): CostComponent {
  return {
    id: row.id,
    organizationId: row.organizationId,
    priceCalculationId: row.priceCalculationId,
    componentType: row.componentType,
    label: row.label,
    amount: row.amount,
    ...(row.metadata ? { metadata: jsonObject(row.metadata) } : {}),
    createdAt: row.createdAt,
  };
}

export class PostgresPriceCalculationRepository implements PriceCalculationRepository {
  constructor(private readonly db: DbExecutor) {}

  async insert(
    calculation: PriceCalculation,
    components: CostComponent[],
    tx?: TransactionContext,
  ): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(priceCalculations).values({
      id: calculation.id,
      organizationId: calculation.organizationId,
      configurationId: calculation.configurationId,
      configurationVersionId: calculation.configurationVersionId,
      configurationVersionNumber: calculation.configurationVersionNumber,
      currency: calculation.currency,
      algorithmVersion: calculation.algorithmVersion,
      targetMarginBps: calculation.targetMarginBps,
      totalCost: calculation.totalCost,
      recommendedPrice: calculation.recommendedPrice,
      inputSnapshot: calculation.inputSnapshot,
      outputSnapshot: calculation.outputSnapshot,
      createdByUserId: calculation.createdByUserId,
      createdByAi: calculation.createdByAi,
      createdAt: calculation.createdAt,
    });
    if (components.length > 0) {
      await executor.insert(costComponents).values(
        components.map((component) => ({
          id: component.id,
          organizationId: component.organizationId,
          priceCalculationId: component.priceCalculationId,
          componentType: component.componentType,
          label: component.label,
          amount: component.amount,
          metadata: component.metadata,
          createdAt: component.createdAt,
        })),
      );
    }
  }

  async findById(organizationId: string, calculationId: string): Promise<PriceCalculationDetail | null> {
    const rows = await this.db
      .select()
      .from(priceCalculations)
      .where(
        and(
          eq(priceCalculations.organizationId, organizationId),
          eq(priceCalculations.id, calculationId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const componentRows = await this.db
      .select()
      .from(costComponents)
      .where(
        and(
          eq(costComponents.organizationId, organizationId),
          eq(costComponents.priceCalculationId, calculationId),
        ),
      )
      .orderBy(asc(costComponents.createdAt));
    return { ...calculationFromRow(row), components: componentRows.map(componentFromRow) };
  }
}

const moneySchema = z.string().regex(MONEY_PATTERN);
const componentSchema = z.object({
  componentType: z.enum([
    'MATERIAL',
    'LABOR',
    'MACHINE',
    'OUTSOURCING',
    'TRANSPORT',
    'PACKAGING',
    'FINISH',
    'OTHER',
  ]),
  label: z.string().trim().min(1).max(255),
  amount: moneySchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPriceCalculationSchema = z.object({
  configurationId: z.string().uuid(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  targetMarginBps: z.number().int().min(0).max(9999),
  components: z.array(componentSchema).min(1).max(100),
});

export class CreatePriceCalculationService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly configurations: ConfigurationRepository,
    private readonly pricing: PriceCalculationRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<PriceCalculationDetail> {
    if (!context.permissions.has('pricing.calculation.create')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing pricing.calculation.create permission.');
    }
    const input = createPriceCalculationSchema.parse(rawInput);
    const configuration = await this.configurations.findById(context.organizationId, input.configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    if (configuration.status !== 'READY_FOR_PRICING') {
      throw new DomainError(
        'PRICING.CONFIGURATION_NOT_READY',
        'Only a READY_FOR_PRICING configuration can be priced.',
      );
    }
    const versions = await this.configurations.listVersions(context.organizationId, configuration.id);
    const currentVersion = versions.find((version) => version.versionNumber === configuration.currentVersion);
    if (!currentVersion) {
      throw new DomainError('PRICING.CONFIGURATION_VERSION_NOT_FOUND', 'Current configuration version was not found.');
    }
    if (currentVersion.readinessIssues.length > 0) {
      throw new DomainError('PRICING.CONFIGURATION_NOT_READY', 'Current configuration version has readiness issues.');
    }

    const result = calculatePrice(input.components, input.targetMarginBps);
    const now = new Date();
    const calculationId = randomUUID();
    const components: CostComponent[] = input.components.map((component) => ({
      id: randomUUID(),
      organizationId: context.organizationId,
      priceCalculationId: calculationId,
      componentType: component.componentType,
      label: component.label,
      amount: formatMoneyUnits(parseMoneyUnits(component.amount)),
      ...(component.metadata ? { metadata: component.metadata } : {}),
      createdAt: now,
    }));
    const calculation: PriceCalculation = {
      id: calculationId,
      organizationId: context.organizationId,
      configurationId: configuration.id,
      configurationVersionId: currentVersion.id,
      configurationVersionNumber: currentVersion.versionNumber,
      currency: input.currency,
      algorithmVersion: PRICING_ALGORITHM_VERSION,
      targetMarginBps: input.targetMarginBps,
      totalCost: result.totalCost,
      recommendedPrice: result.recommendedPrice,
      inputSnapshot: {
        configurationId: configuration.id,
        configurationVersionId: currentVersion.id,
        configurationVersionNumber: currentVersion.versionNumber,
        configurationData: currentVersion.configurationData,
        costComponents: components.map(({ componentType, label, amount, metadata }) => ({
          componentType,
          label,
          amount,
          ...(metadata ? { metadata } : {}),
        })),
      },
      outputSnapshot: {
        totalCost: result.totalCost,
        recommendedPrice: result.recommendedPrice,
        targetMarginBps: input.targetMarginBps,
        algorithmVersion: PRICING_ALGORITHM_VERSION,
      },
      ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
      createdByAi: context.actor.type === 'AI_AGENT',
      createdAt: now,
    };
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'PriceCalculationCreated',
      aggregateType: 'PriceCalculation',
      aggregateId: calculation.id,
      payload: {
        priceCalculationId: calculation.id,
        configurationId: calculation.configurationId,
        configurationVersionNumber: calculation.configurationVersionNumber,
        currency: calculation.currency,
        totalCost: calculation.totalCost,
        recommendedPrice: calculation.recommendedPrice,
        targetMarginBps: calculation.targetMarginBps,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.pricing.insert(calculation, components, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'PriceCalculation',
          entityId: calculation.id,
          action: 'CREATE',
          afterData: {
            configurationId: calculation.configurationId,
            configurationVersionNumber: calculation.configurationVersionNumber,
            currency: calculation.currency,
            totalCost: calculation.totalCost,
            recommendedPrice: calculation.recommendedPrice,
            targetMarginBps: calculation.targetMarginBps,
            algorithmVersion: calculation.algorithmVersion,
          },
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    return { ...calculation, components };
  }
}

export class ReadPriceCalculationService {
  constructor(private readonly pricing: PriceCalculationRepository) {}

  async byId(calculationId: string, context: RequestContext): Promise<PriceCalculationDetail> {
    if (!context.permissions.has('pricing.calculation.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing pricing.calculation.read permission.');
    }
    const calculation = await this.pricing.findById(context.organizationId, calculationId);
    if (!calculation) throw new DomainError('PRICING.CALCULATION_NOT_FOUND', 'Price calculation was not found.');
    return calculation;
  }
}
