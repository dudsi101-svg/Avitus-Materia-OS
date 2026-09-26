import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { ProductRepository } from '@avitus/catalog';
import type { ConfigurationRepository } from '@avitus/configurator';
import type { OpportunityRepository } from '@avitus/crm';
import {
  executorFrom,
  quoteItems,
  quotes,
  quoteVersions,
  type DbExecutor,
} from '@avitus/database';
import type { DomainEventStore } from '@avitus/events';
import type { PriceCalculationDetail, PriceCalculationRepository } from '@avitus/pricing';
import { subtractMoney } from '@avitus/pricing';
import {
  DomainError,
  newDomainEvent,
  type RequestContext,
  type TransactionContext,
  type UnitOfWork,
} from '@avitus/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

export type QuoteStatus =
  | 'DRAFT'
  | 'INTERNAL_REVIEW'
  | 'READY'
  | 'SENT'
  | 'VIEWED'
  | 'NEGOTIATION'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'WITHDRAWN'
  | 'REVISION_REQUIRED'
  | 'SUPERSEDED';

export interface Quote {
  id: string;
  organizationId: string;
  opportunityId: string;
  configurationId: string;
  quoteNumber: string;
  status: QuoteStatus;
  currency: string;
  currentVersion: number;
  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuoteVersion {
  id: string;
  organizationId: string;
  quoteId: string;
  versionNumber: number;
  priceCalculationId: string;
  configurationVersionNumber: number;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  estimatedCost: string;
  marginAmount: string;
  marginBps: number;
  pricingSnapshot: Record<string, unknown>;
  reason?: string;
  validUntil?: string;
  createdByUserId?: string;
  createdByAi: boolean;
  createdAt: Date;
  items: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  organizationId: string;
  quoteVersionId: string;
  productId: string;
  configurationId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  estimatedCost: string;
  createdAt: Date;
}

export interface QuoteDetail extends Quote {
  versions: QuoteVersion[];
}

export interface QuoteRepository {
  insert(quote: Quote, version: QuoteVersion, tx?: TransactionContext): Promise<void>;
  appendVersion(
    quote: Quote,
    previousVersionNumber: number,
    version: QuoteVersion,
    tx?: TransactionContext,
  ): Promise<void>;
  findById(organizationId: string, quoteId: string): Promise<Quote | null>;
  listVersions(organizationId: string, quoteId: string): Promise<QuoteVersion[]>;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function quoteFromRow(row: typeof quotes.$inferSelect): Quote {
  return {
    id: row.id,
    organizationId: row.organizationId,
    opportunityId: row.opportunityId,
    configurationId: row.configurationId,
    quoteNumber: row.quoteNumber,
    status: row.status,
    currency: row.currency,
    currentVersion: row.currentVersion,
    ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function itemFromRow(row: typeof quoteItems.$inferSelect): QuoteItem {
  return {
    id: row.id,
    organizationId: row.organizationId,
    quoteVersionId: row.quoteVersionId,
    productId: row.productId,
    configurationId: row.configurationId,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    lineTotal: row.lineTotal,
    estimatedCost: row.estimatedCost,
    createdAt: row.createdAt,
  };
}

export class PostgresQuoteRepository implements QuoteRepository {
  constructor(private readonly db: DbExecutor) {}

  private async insertVersion(version: QuoteVersion, executor: DbExecutor): Promise<void> {
    await executor.insert(quoteVersions).values({
      id: version.id,
      organizationId: version.organizationId,
      quoteId: version.quoteId,
      versionNumber: version.versionNumber,
      priceCalculationId: version.priceCalculationId,
      configurationVersionNumber: version.configurationVersionNumber,
      subtotal: version.subtotal,
      discountAmount: version.discountAmount,
      taxAmount: version.taxAmount,
      total: version.total,
      estimatedCost: version.estimatedCost,
      marginAmount: version.marginAmount,
      marginBps: version.marginBps,
      pricingSnapshot: version.pricingSnapshot,
      reason: version.reason,
      validUntil: version.validUntil,
      createdByUserId: version.createdByUserId,
      createdByAi: version.createdByAi,
      createdAt: version.createdAt,
    });
    await executor.insert(quoteItems).values(
      version.items.map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        quoteVersionId: item.quoteVersionId,
        productId: item.productId,
        configurationId: item.configurationId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        estimatedCost: item.estimatedCost,
        createdAt: item.createdAt,
      })),
    );
  }

  async insert(quote: Quote, version: QuoteVersion, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(quotes).values({
      id: quote.id,
      organizationId: quote.organizationId,
      opportunityId: quote.opportunityId,
      configurationId: quote.configurationId,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      currentVersion: quote.currentVersion,
      createdByUserId: quote.createdByUserId,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    });
    await this.insertVersion(version, executor);
  }

  async appendVersion(
    quote: Quote,
    previousVersionNumber: number,
    version: QuoteVersion,
    tx?: TransactionContext,
  ): Promise<void> {
    const executor = executorFrom(tx, this.db);
    const changed = await executor
      .update(quotes)
      .set({ currentVersion: quote.currentVersion, updatedAt: quote.updatedAt })
      .where(
        and(
          eq(quotes.organizationId, quote.organizationId),
          eq(quotes.id, quote.id),
          eq(quotes.currentVersion, previousVersionNumber),
        ),
      )
      .returning({ id: quotes.id });
    if (changed.length !== 1) {
      throw new DomainError('QUOTE.VERSION_CONFLICT', 'Quote was revised concurrently. Reload and retry.');
    }
    await this.insertVersion(version, executor);
  }

  async findById(organizationId: string, quoteId: string): Promise<Quote | null> {
    const rows = await this.db
      .select()
      .from(quotes)
      .where(and(eq(quotes.organizationId, organizationId), eq(quotes.id, quoteId)))
      .limit(1);
    return rows[0] ? quoteFromRow(rows[0]) : null;
  }

  async listVersions(organizationId: string, quoteId: string): Promise<QuoteVersion[]> {
    const versionRows = await this.db
      .select()
      .from(quoteVersions)
      .where(and(eq(quoteVersions.organizationId, organizationId), eq(quoteVersions.quoteId, quoteId)))
      .orderBy(asc(quoteVersions.versionNumber));
    if (versionRows.length === 0) return [];
    const itemRows = await this.db
      .select()
      .from(quoteItems)
      .where(
        and(
          eq(quoteItems.organizationId, organizationId),
          inArray(quoteItems.quoteVersionId, versionRows.map((row) => row.id)),
        ),
      );
    return versionRows.map((row) => ({
      id: row.id,
      organizationId: row.organizationId,
      quoteId: row.quoteId,
      versionNumber: row.versionNumber,
      priceCalculationId: row.priceCalculationId,
      configurationVersionNumber: row.configurationVersionNumber,
      subtotal: row.subtotal,
      discountAmount: row.discountAmount,
      taxAmount: row.taxAmount,
      total: row.total,
      estimatedCost: row.estimatedCost,
      marginAmount: row.marginAmount,
      marginBps: row.marginBps,
      pricingSnapshot: jsonObject(row.pricingSnapshot),
      ...(row.reason ? { reason: row.reason } : {}),
      ...(row.validUntil ? { validUntil: row.validUntil } : {}),
      ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
      createdByAi: row.createdByAi,
      createdAt: row.createdAt,
      items: itemRows.filter((item) => item.quoteVersionId === row.id).map(itemFromRow),
    }));
  }
}

const validUntilSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
export const createQuoteSchema = z.object({
  opportunityId: z.string().uuid(),
  configurationId: z.string().uuid(),
  priceCalculationId: z.string().uuid(),
  validUntil: validUntilSchema,
});
export const reviseQuoteSchema = z.object({
  priceCalculationId: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
  validUntil: validUntilSchema,
});

function assertCalculationCurrent(
  calculation: PriceCalculationDetail,
  configurationId: string,
  currentVersion: number,
): void {
  if (calculation.configurationId !== configurationId) {
    throw new DomainError('QUOTE.PRICE_CALCULATION_MISMATCH', 'Price calculation belongs to another configuration.');
  }
  if (calculation.configurationVersionNumber !== currentVersion) {
    throw new DomainError(
      'QUOTE.STALE_PRICE_CALCULATION',
      'Price calculation targets an older configuration version. Recalculate before quoting.',
      {
        calculationVersion: calculation.configurationVersionNumber,
        currentConfigurationVersion: currentVersion,
      },
    );
  }
}

function buildVersion(
  quoteId: string,
  organizationId: string,
  versionNumber: number,
  configurationId: string,
  productId: string,
  productName: string,
  calculation: PriceCalculationDetail,
  context: RequestContext,
  now: Date,
  reason?: string,
  validUntil?: string,
): QuoteVersion {
  const versionId = randomUUID();
  const marginAmount = subtractMoney(calculation.recommendedPrice, calculation.totalCost);
  const item: QuoteItem = {
    id: randomUUID(),
    organizationId,
    quoteVersionId: versionId,
    productId,
    configurationId,
    description: productName,
    quantity: 1,
    unitPrice: calculation.recommendedPrice,
    lineTotal: calculation.recommendedPrice,
    estimatedCost: calculation.totalCost,
    createdAt: now,
  };
  return {
    id: versionId,
    organizationId,
    quoteId,
    versionNumber,
    priceCalculationId: calculation.id,
    configurationVersionNumber: calculation.configurationVersionNumber,
    subtotal: calculation.recommendedPrice,
    discountAmount: '0.0000',
    taxAmount: '0.0000',
    total: calculation.recommendedPrice,
    estimatedCost: calculation.totalCost,
    marginAmount,
    marginBps: calculation.targetMarginBps,
    pricingSnapshot: {
      priceCalculationId: calculation.id,
      algorithmVersion: calculation.algorithmVersion,
      configurationVersionId: calculation.configurationVersionId,
      configurationVersionNumber: calculation.configurationVersionNumber,
      targetMarginBps: calculation.targetMarginBps,
      totalCost: calculation.totalCost,
      recommendedPrice: calculation.recommendedPrice,
      components: calculation.components.map(({ componentType, label, amount }) => ({ componentType, label, amount })),
    },
    ...(reason ? { reason } : {}),
    ...(validUntil ? { validUntil } : {}),
    ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
    createdByAi: context.actor.type === 'AI_AGENT',
    createdAt: now,
    items: [item],
  };
}

export class CreateQuoteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly opportunities: OpportunityRepository,
    private readonly configurations: ConfigurationRepository,
    private readonly products: ProductRepository,
    private readonly pricing: PriceCalculationRepository,
    private readonly quotes: QuoteRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(rawInput: unknown, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.create')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.create permission.');
    }
    const input = createQuoteSchema.parse(rawInput);
    const opportunity = await this.opportunities.findById(context.organizationId, input.opportunityId);
    if (!opportunity) throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    const configuration = await this.configurations.findById(context.organizationId, input.configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    if (configuration.opportunityId !== opportunity.id) {
      throw new DomainError('QUOTE.CONFIGURATION_OPPORTUNITY_MISMATCH', 'Configuration does not belong to this opportunity.');
    }
    const product = await this.products.findActiveById(context.organizationId, configuration.productId);
    if (!product) throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found.');
    const calculation = await this.pricing.findById(context.organizationId, input.priceCalculationId);
    if (!calculation) throw new DomainError('PRICING.CALCULATION_NOT_FOUND', 'Price calculation was not found.');
    assertCalculationCurrent(calculation, configuration.id, configuration.currentVersion);

    const now = new Date();
    const quoteId = randomUUID();
    const quote: Quote = {
      id: quoteId,
      organizationId: context.organizationId,
      opportunityId: opportunity.id,
      configurationId: configuration.id,
      quoteNumber: `Q-${now.getUTCFullYear()}-${quoteId.slice(0, 8).toUpperCase()}`,
      status: 'DRAFT',
      currency: calculation.currency,
      currentVersion: 1,
      ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const version = buildVersion(
      quote.id,
      context.organizationId,
      1,
      configuration.id,
      configuration.productId,
      product.name,
      calculation,
      context,
      now,
      undefined,
      input.validUntil,
    );
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'QuoteCreated',
      aggregateType: 'Quote',
      aggregateId: quote.id,
      payload: {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        opportunityId: quote.opportunityId,
        configurationId: quote.configurationId,
        configurationVersionNumber: version.configurationVersionNumber,
        quoteVersionNumber: 1,
        total: version.total,
        currency: quote.currency,
        status: quote.status,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.quotes.insert(quote, version, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Quote',
          entityId: quote.id,
          action: 'CREATE',
          afterData: {
            quoteNumber: quote.quoteNumber,
            quoteVersionNumber: 1,
            configurationVersionNumber: version.configurationVersionNumber,
            total: version.total,
            currency: quote.currency,
            status: quote.status,
          },
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    return { ...quote, versions: [version] };
  }
}

export class ReviseQuoteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly configurations: ConfigurationRepository,
    private readonly products: ProductRepository,
    private readonly pricing: PriceCalculationRepository,
    private readonly quotes: QuoteRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(quoteId: string, rawInput: unknown, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.create')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.create permission.');
    }
    const input = reviseQuoteSchema.parse(rawInput);
    const current = await this.quotes.findById(context.organizationId, quoteId);
    if (!current) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    if (current.status !== 'DRAFT' && current.status !== 'REVISION_REQUIRED') {
      throw new DomainError('QUOTE.IMMUTABLE_VERSION_STATE', 'Quote cannot be revised in its current state.');
    }
    const configuration = await this.configurations.findById(context.organizationId, current.configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    const product = await this.products.findActiveById(context.organizationId, configuration.productId);
    if (!product) throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found.');
    const calculation = await this.pricing.findById(context.organizationId, input.priceCalculationId);
    if (!calculation) throw new DomainError('PRICING.CALCULATION_NOT_FOUND', 'Price calculation was not found.');
    assertCalculationCurrent(calculation, configuration.id, configuration.currentVersion);
    if (calculation.currency !== current.currency) {
      throw new DomainError('QUOTE.CURRENCY_MISMATCH', 'Quote revisions must preserve quote currency.');
    }

    const now = new Date();
    const next: Quote = { ...current, currentVersion: current.currentVersion + 1, updatedAt: now };
    const version = buildVersion(
      current.id,
      context.organizationId,
      next.currentVersion,
      configuration.id,
      configuration.productId,
      product.name,
      calculation,
      context,
      now,
      input.reason,
      input.validUntil,
    );
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'QuoteVersionCreated',
      aggregateType: 'Quote',
      aggregateId: quoteId,
      payload: {
        quoteId,
        quoteVersionNumber: version.versionNumber,
        previousQuoteVersionNumber: current.currentVersion,
        configurationVersionNumber: version.configurationVersionNumber,
        total: version.total,
        currency: current.currency,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    await this.uow.run(async (tx) => {
      await this.quotes.appendVersion(next, current.currentVersion, version, tx);
      await this.events.append(event, tx);
      await this.audit.append(
        {
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Quote',
          entityId: quoteId,
          action: 'REVISE',
          beforeData: { quoteVersionNumber: current.currentVersion },
          afterData: {
            quoteVersionNumber: version.versionNumber,
            configurationVersionNumber: version.configurationVersionNumber,
            total: version.total,
            currency: current.currency,
          },
          reason: input.reason,
          correlationId: context.correlationId,
        },
        tx,
      );
    });
    return { ...next, versions: await this.quotes.listVersions(context.organizationId, quoteId) };
  }
}

export class ReadQuoteService {
  constructor(private readonly quotes: QuoteRepository) {}

  async byId(quoteId: string, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.read')) {
      throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.read permission.');
    }
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    return { ...quote, versions: await this.quotes.listVersions(context.organizationId, quoteId) };
  }
}
