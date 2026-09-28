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
import { formatMoneyUnits, parseMoneyUnits, subtractMoney } from '@avitus/pricing';
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

export interface QuoteBuyerSnapshot {
  customerAccountId: string;
  subjectType: 'PERSON' | 'COMPANY';
  displayName: string;
  preferredLanguage: string;
  email?: string;
  phone?: string;
  legalName?: string;
  taxId?: string;
}

export interface Quote {
  id: string;
  organizationId: string;
  opportunityId: string;
  configurationId: string;
  quoteNumber: string;
  status: QuoteStatus;
  currency: string;
  currentVersion: number;
  readyAt?: Date;
  sentAt?: Date;
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
  buyerSnapshot?: QuoteBuyerSnapshot;
  taxRateBps?: number;
  discountReason?: string;
  discountApprovedByUserId?: string;
  discountApprovedAt?: Date;
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
  appendVersion(quote: Quote, previousVersionNumber: number, version: QuoteVersion, tx?: TransactionContext): Promise<void>;
  findById(organizationId: string, quoteId: string): Promise<Quote | null>;
  listVersions(organizationId: string, quoteId: string): Promise<QuoteVersion[]>;
  approveDiscount(
    organizationId: string,
    quoteId: string,
    versionNumber: number,
    userId: string,
    approvedAt: Date,
    tx?: TransactionContext,
  ): Promise<void>;
  transitionStatus(
    organizationId: string,
    quoteId: string,
    currentVersion: number,
    expectedStatuses: QuoteStatus[],
    nextStatus: QuoteStatus,
    at: Date,
    tx?: TransactionContext,
  ): Promise<Quote>;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function buyerSnapshotFromJson(value: unknown): QuoteBuyerSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  if (
    typeof row.customerAccountId !== 'string' ||
    (row.subjectType !== 'PERSON' && row.subjectType !== 'COMPANY') ||
    typeof row.displayName !== 'string' ||
    typeof row.preferredLanguage !== 'string'
  ) return undefined;
  return {
    customerAccountId: row.customerAccountId,
    subjectType: row.subjectType,
    displayName: row.displayName,
    preferredLanguage: row.preferredLanguage,
    ...(typeof row.email === 'string' ? { email: row.email } : {}),
    ...(typeof row.phone === 'string' ? { phone: row.phone } : {}),
    ...(typeof row.legalName === 'string' ? { legalName: row.legalName } : {}),
    ...(typeof row.taxId === 'string' ? { taxId: row.taxId } : {}),
  };
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
    ...(row.readyAt ? { readyAt: row.readyAt } : {}),
    ...(row.sentAt ? { sentAt: row.sentAt } : {}),
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
      buyerSnapshot: version.buyerSnapshot,
      taxRateBps: version.taxRateBps,
      discountReason: version.discountReason,
      discountApprovedByUserId: version.discountApprovedByUserId,
      discountApprovedAt: version.discountApprovedAt,
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
      readyAt: quote.readyAt,
      sentAt: quote.sentAt,
      createdByUserId: quote.createdByUserId,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    });
    await this.insertVersion(version, executor);
  }

  async appendVersion(quote: Quote, previousVersionNumber: number, version: QuoteVersion, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    const changed = await executor
      .update(quotes)
      .set({ currentVersion: quote.currentVersion, status: quote.status, readyAt: quote.readyAt, sentAt: quote.sentAt, updatedAt: quote.updatedAt })
      .where(and(eq(quotes.organizationId, quote.organizationId), eq(quotes.id, quote.id), eq(quotes.currentVersion, previousVersionNumber)))
      .returning({ id: quotes.id });
    if (changed.length !== 1) throw new DomainError('QUOTE.VERSION_CONFLICT', 'Quote was revised concurrently. Reload and retry.');
    await this.insertVersion(version, executor);
  }

  async findById(organizationId: string, quoteId: string): Promise<Quote | null> {
    const rows = await this.db.select().from(quotes).where(and(eq(quotes.organizationId, organizationId), eq(quotes.id, quoteId))).limit(1);
    return rows[0] ? quoteFromRow(rows[0]) : null;
  }

  async listVersions(organizationId: string, quoteId: string): Promise<QuoteVersion[]> {
    const versionRows = await this.db.select().from(quoteVersions)
      .where(and(eq(quoteVersions.organizationId, organizationId), eq(quoteVersions.quoteId, quoteId)))
      .orderBy(asc(quoteVersions.versionNumber));
    if (versionRows.length === 0) return [];
    const itemRows = await this.db.select().from(quoteItems)
      .where(and(eq(quoteItems.organizationId, organizationId), inArray(quoteItems.quoteVersionId, versionRows.map((row) => row.id))));
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
      ...(buyerSnapshotFromJson(row.buyerSnapshot) ? { buyerSnapshot: buyerSnapshotFromJson(row.buyerSnapshot)! } : {}),
      ...(row.taxRateBps !== null ? { taxRateBps: row.taxRateBps } : {}),
      ...(row.discountReason ? { discountReason: row.discountReason } : {}),
      ...(row.discountApprovedByUserId ? { discountApprovedByUserId: row.discountApprovedByUserId } : {}),
      ...(row.discountApprovedAt ? { discountApprovedAt: row.discountApprovedAt } : {}),
      ...(row.reason ? { reason: row.reason } : {}),
      ...(row.validUntil ? { validUntil: row.validUntil } : {}),
      ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
      createdByAi: row.createdByAi,
      createdAt: row.createdAt,
      items: itemRows.filter((item) => item.quoteVersionId === row.id).map(itemFromRow),
    }));
  }

  async approveDiscount(
    organizationId: string,
    quoteId: string,
    versionNumber: number,
    userId: string,
    approvedAt: Date,
    tx?: TransactionContext,
  ): Promise<void> {
    const executor = executorFrom(tx, this.db);
    const changed = await executor.update(quoteVersions)
      .set({ discountApprovedByUserId: userId, discountApprovedAt: approvedAt })
      .where(and(eq(quoteVersions.organizationId, organizationId), eq(quoteVersions.quoteId, quoteId), eq(quoteVersions.versionNumber, versionNumber)))
      .returning({ id: quoteVersions.id });
    if (changed.length !== 1) throw new DomainError('QUOTE.VERSION_CONFLICT', 'Quote version changed before discount approval.');
  }

  async transitionStatus(
    organizationId: string,
    quoteId: string,
    currentVersion: number,
    expectedStatuses: QuoteStatus[],
    nextStatus: QuoteStatus,
    at: Date,
    tx?: TransactionContext,
  ): Promise<Quote> {
    const executor = executorFrom(tx, this.db);
    const changed = await executor.update(quotes)
      .set({
        status: nextStatus,
        updatedAt: at,
        ...(nextStatus === 'READY' ? { readyAt: at } : {}),
        ...(nextStatus === 'SENT' ? { sentAt: at } : {}),
      })
      .where(and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.id, quoteId),
        eq(quotes.currentVersion, currentVersion),
        inArray(quotes.status, expectedStatuses),
      ))
      .returning();
    if (changed.length !== 1) throw new DomainError('QUOTE.STATUS_CONFLICT', 'Quote state changed concurrently or transition is not allowed.');
    return quoteFromRow(changed[0]!);
  }
}

const validUntilSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const moneySchema = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,4})?$/).optional();
const commercialTermsSchema = {
  taxRateBps: z.number().int().min(0).max(10_000).optional(),
  discountAmount: moneySchema,
  discountReason: z.string().trim().min(1).max(2000).optional(),
} as const;

export const createQuoteSchema = z.object({
  opportunityId: z.string().uuid(),
  configurationId: z.string().uuid(),
  priceCalculationId: z.string().uuid(),
  validUntil: validUntilSchema,
  ...commercialTermsSchema,
});

export const reviseQuoteSchema = z.object({
  priceCalculationId: z.string().uuid(),
  reason: z.string().trim().min(1).max(2000),
  validUntil: validUntilSchema,
  ...commercialTermsSchema,
});

function assertCalculationCurrent(calculation: PriceCalculationDetail, configurationId: string, currentVersion: number): void {
  if (calculation.configurationId !== configurationId) {
    throw new DomainError('QUOTE.PRICE_CALCULATION_MISMATCH', 'Price calculation belongs to another configuration.');
  }
  if (calculation.configurationVersionNumber !== currentVersion) {
    throw new DomainError('QUOTE.STALE_PRICE_CALCULATION', 'Price calculation targets an older configuration version. Recalculate before quoting.', {
      calculationVersion: calculation.configurationVersionNumber,
      currentConfigurationVersion: currentVersion,
    });
  }
}

function roundRatio(numerator: bigint, denominator: bigint): bigint {
  if (numerator === 0n) return 0n;
  return (numerator + denominator / 2n) / denominator;
}

export function calculateCommercialTerms(
  subtotal: string,
  estimatedCost: string,
  discountAmount = '0.0000',
  taxRateBps?: number,
): { discountAmount: string; netAmount: string; taxAmount: string; total: string; marginAmount: string; marginBps: number } {
  if (taxRateBps !== undefined && (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000)) {
    throw new DomainError('QUOTE.INVALID_TAX_RATE', 'Tax rate must be an integer from 0 to 10000 basis points.');
  }
  const subtotalUnits = parseMoneyUnits(subtotal);
  const discountUnits = parseMoneyUnits(discountAmount);
  const costUnits = parseMoneyUnits(estimatedCost);
  if (discountUnits > subtotalUnits) throw new DomainError('QUOTE.DISCOUNT_EXCEEDS_SUBTOTAL', 'Discount cannot exceed quote subtotal.');
  const netUnits = subtotalUnits - discountUnits;
  if (netUnits < costUnits) throw new DomainError('QUOTE.PRICE_BELOW_COST', 'Discounted selling price cannot be below estimated cost.');
  const taxUnits = taxRateBps === undefined ? 0n : roundRatio(netUnits * BigInt(taxRateBps), 10_000n);
  const totalUnits = netUnits + taxUnits;
  const marginUnits = netUnits - costUnits;
  const marginBps = netUnits === 0n ? 0 : Number((marginUnits * 10_000n) / netUnits);
  return {
    discountAmount: formatMoneyUnits(discountUnits),
    netAmount: formatMoneyUnits(netUnits),
    taxAmount: formatMoneyUnits(taxUnits),
    total: formatMoneyUnits(totalUnits),
    marginAmount: formatMoneyUnits(marginUnits),
    marginBps,
  };
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
  buyerSnapshot: QuoteBuyerSnapshot | undefined,
  terms: { discountAmount?: string; discountReason?: string; taxRateBps?: number },
  reason?: string,
  validUntil?: string,
): QuoteVersion {
  const discountAmount = terms.discountAmount ?? '0.0000';
  const commercial = calculateCommercialTerms(calculation.recommendedPrice, calculation.totalCost, discountAmount, terms.taxRateBps);
  if (parseMoneyUnits(commercial.discountAmount) > 0n && !terms.discountReason) {
    throw new DomainError('QUOTE.DISCOUNT_REASON_REQUIRED', 'A reason is required for every non-zero discount.');
  }
  const versionId = randomUUID();
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
    discountAmount: commercial.discountAmount,
    taxAmount: commercial.taxAmount,
    total: commercial.total,
    estimatedCost: calculation.totalCost,
    marginAmount: commercial.marginAmount,
    marginBps: commercial.marginBps,
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
    ...(buyerSnapshot ? { buyerSnapshot } : {}),
    ...(terms.taxRateBps !== undefined ? { taxRateBps: terms.taxRateBps } : {}),
    ...(terms.discountReason ? { discountReason: terms.discountReason } : {}),
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

  async execute(rawInput: unknown, context: RequestContext, buyerSnapshot?: QuoteBuyerSnapshot): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.create')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.create permission.');
    const input = createQuoteSchema.parse(rawInput);
    const opportunity = await this.opportunities.findById(context.organizationId, input.opportunityId);
    if (!opportunity) throw new DomainError('CRM.OPPORTUNITY_NOT_FOUND', 'Opportunity was not found.');
    const configuration = await this.configurations.findById(context.organizationId, input.configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    if (configuration.opportunityId !== opportunity.id) throw new DomainError('QUOTE.CONFIGURATION_OPPORTUNITY_MISMATCH', 'Configuration does not belong to this opportunity.');
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
    const version = buildVersion(quote.id, context.organizationId, 1, configuration.id, configuration.productId, product.name, calculation, context, now, buyerSnapshot, input, undefined, input.validUntil);
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
        subtotal: version.subtotal,
        discountAmount: version.discountAmount,
        taxAmount: version.taxAmount,
        total: version.total,
        marginBps: version.marginBps,
        currency: quote.currency,
        status: quote.status,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    await this.uow.run(async (tx) => {
      await this.quotes.insert(quote, version, tx);
      await this.events.append(event, tx);
      await this.audit.append({
        organizationId: context.organizationId,
        actor: context.actor,
        entityType: 'Quote',
        entityId: quote.id,
        action: 'CREATE',
        afterData: { quoteNumber: quote.quoteNumber, quoteVersionNumber: 1, configurationVersionNumber: version.configurationVersionNumber, discountAmount: version.discountAmount, taxAmount: version.taxAmount, total: version.total, marginBps: version.marginBps, currency: quote.currency, status: quote.status },
        correlationId: context.correlationId,
      }, tx);
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

  async execute(quoteId: string, rawInput: unknown, context: RequestContext, buyerSnapshot?: QuoteBuyerSnapshot): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.create')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.create permission.');
    const input = reviseQuoteSchema.parse(rawInput);
    const current = await this.quotes.findById(context.organizationId, quoteId);
    if (!current) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    if (current.status !== 'DRAFT' && current.status !== 'REVISION_REQUIRED') throw new DomainError('QUOTE.IMMUTABLE_VERSION_STATE', 'Quote cannot be revised in its current state.');
    const configuration = await this.configurations.findById(context.organizationId, current.configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    const product = await this.products.findActiveById(context.organizationId, configuration.productId);
    if (!product) throw new DomainError('CATALOG.PRODUCT_NOT_FOUND', 'Product was not found.');
    const calculation = await this.pricing.findById(context.organizationId, input.priceCalculationId);
    if (!calculation) throw new DomainError('PRICING.CALCULATION_NOT_FOUND', 'Price calculation was not found.');
    assertCalculationCurrent(calculation, configuration.id, configuration.currentVersion);
    if (calculation.currency !== current.currency) throw new DomainError('QUOTE.CURRENCY_MISMATCH', 'Quote revisions must preserve quote currency.');

    const now = new Date();
    const next: Quote = { ...current, status: 'DRAFT', readyAt: undefined, sentAt: undefined, currentVersion: current.currentVersion + 1, updatedAt: now };
    const version = buildVersion(current.id, context.organizationId, next.currentVersion, configuration.id, configuration.productId, product.name, calculation, context, now, buyerSnapshot, input, input.reason, input.validUntil);
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'QuoteVersionCreated',
      aggregateType: 'Quote',
      aggregateId: quoteId,
      payload: { quoteId, quoteVersionNumber: version.versionNumber, previousQuoteVersionNumber: current.currentVersion, configurationVersionNumber: version.configurationVersionNumber, discountAmount: version.discountAmount, taxAmount: version.taxAmount, total: version.total, marginBps: version.marginBps, currency: current.currency },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    await this.uow.run(async (tx) => {
      await this.quotes.appendVersion(next, current.currentVersion, version, tx);
      await this.events.append(event, tx);
      await this.audit.append({
        organizationId: context.organizationId,
        actor: context.actor,
        entityType: 'Quote',
        entityId: quoteId,
        action: 'REVISE',
        beforeData: { quoteVersionNumber: current.currentVersion },
        afterData: { quoteVersionNumber: version.versionNumber, configurationVersionNumber: version.configurationVersionNumber, discountAmount: version.discountAmount, taxAmount: version.taxAmount, total: version.total, marginBps: version.marginBps, currency: current.currency },
        reason: input.reason,
        correlationId: context.correlationId,
      }, tx);
    });
    return { ...next, versions: await this.quotes.listVersions(context.organizationId, quoteId) };
  }
}

export class ApproveQuoteDiscountService {
  constructor(private readonly uow: UnitOfWork, private readonly quotes: QuoteRepository, private readonly events: DomainEventStore, private readonly audit: AuditStore) {}

  async execute(quoteId: string, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.approve_discount')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.approve_discount permission.');
    if (context.actor.type !== 'USER') throw new DomainError('QUOTE.DISCOUNT_APPROVAL_REQUIRES_USER', 'Discount approval requires a human user.');
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    if (!['DRAFT', 'INTERNAL_REVIEW', 'REVISION_REQUIRED'].includes(quote.status)) throw new DomainError('QUOTE.STATUS_CONFLICT', 'Discount cannot be approved in the current Quote state.');
    const versions = await this.quotes.listVersions(context.organizationId, quoteId);
    const version = versions.find((item) => item.versionNumber === quote.currentVersion);
    if (!version) throw new DomainError('QUOTE.VERSION_NOT_FOUND', 'Current Quote version was not found.');
    if (parseMoneyUnits(version.discountAmount) === 0n) throw new DomainError('QUOTE.NO_DISCOUNT_TO_APPROVE', 'Current Quote version has no discount.');
    if (!version.discountReason) throw new DomainError('QUOTE.DISCOUNT_REASON_REQUIRED', 'Discount reason is required before approval.');
    if (version.discountApprovedByUserId) return { ...quote, versions };
    const now = new Date();
    const event = newDomainEvent({ organizationId: context.organizationId, eventType: 'QuoteDiscountApproved', aggregateType: 'Quote', aggregateId: quote.id, payload: { quoteId: quote.id, quoteVersionNumber: quote.currentVersion, discountAmount: version.discountAmount, marginBps: version.marginBps }, correlationId: context.correlationId, actor: context.actor });
    await this.uow.run(async (tx) => {
      await this.quotes.approveDiscount(context.organizationId, quote.id, quote.currentVersion, context.actor.id, now, tx);
      await this.events.append(event, tx);
      await this.audit.append({ organizationId: context.organizationId, actor: context.actor, entityType: 'Quote', entityId: quote.id, action: 'APPROVE_DISCOUNT', afterData: { quoteVersionNumber: quote.currentVersion, discountAmount: version.discountAmount, marginBps: version.marginBps }, reason: version.discountReason, correlationId: context.correlationId }, tx);
    });
    return { ...quote, versions: await this.quotes.listVersions(context.organizationId, quote.id) };
  }
}

export class ReadyQuoteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly configurations: ConfigurationRepository,
    private readonly pricing: PriceCalculationRepository,
    private readonly quotes: QuoteRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(quoteId: string, linkedCustomerAccountId: string | null, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.ready')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.ready permission.');
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    if (quote.status === 'READY') return { ...quote, versions: await this.quotes.listVersions(context.organizationId, quote.id) };
    if (!['DRAFT', 'INTERNAL_REVIEW', 'REVISION_REQUIRED'].includes(quote.status)) throw new DomainError('QUOTE.STATUS_CONFLICT', 'Quote cannot become READY from its current state.');
    const versions = await this.quotes.listVersions(context.organizationId, quote.id);
    const version = versions.find((item) => item.versionNumber === quote.currentVersion);
    if (!version) throw new DomainError('QUOTE.VERSION_NOT_FOUND', 'Current Quote version was not found.');
    const configuration = await this.configurations.findById(context.organizationId, quote.configurationId);
    if (!configuration) throw new DomainError('CONFIGURATION.NOT_FOUND', 'Configuration was not found.');
    const calculation = await this.pricing.findById(context.organizationId, version.priceCalculationId);
    if (!calculation) throw new DomainError('PRICING.CALCULATION_NOT_FOUND', 'Price calculation was not found.');
    assertCalculationCurrent(calculation, configuration.id, configuration.currentVersion);
    if (!linkedCustomerAccountId) throw new DomainError('QUOTE.BUYER_REQUIRED', 'Opportunity must be linked to a CustomerAccount before Quote can become READY.');
    if (!version.buyerSnapshot || version.buyerSnapshot.customerAccountId !== linkedCustomerAccountId) throw new DomainError('QUOTE.BUYER_SNAPSHOT_STALE', 'Current Quote version does not contain the current Opportunity buyer snapshot. Revise the Quote first.');
    if (version.taxRateBps === undefined) throw new DomainError('QUOTE.TAX_POLICY_REQUIRED', 'Explicit tax rate is required before Quote can become READY.');
    if (!version.validUntil) throw new DomainError('QUOTE.VALID_UNTIL_REQUIRED', 'Quote validity date is required before READY.');
    if (version.validUntil < new Date().toISOString().slice(0, 10)) throw new DomainError('QUOTE.EXPIRED_VALIDITY', 'Quote validity date cannot be in the past.');
    if (parseMoneyUnits(version.discountAmount) > 0n && (!version.discountReason || !version.discountApprovedByUserId)) throw new DomainError('QUOTE.DISCOUNT_APPROVAL_REQUIRED', 'Discount must have a reason and human approval before READY.');
    subtractMoney(version.total, version.taxAmount);
    const now = new Date();
    const event = newDomainEvent({ organizationId: context.organizationId, eventType: 'QuoteReady', aggregateType: 'Quote', aggregateId: quote.id, payload: { quoteId: quote.id, quoteVersionNumber: quote.currentVersion, total: version.total, taxAmount: version.taxAmount, discountAmount: version.discountAmount, marginBps: version.marginBps, currency: quote.currency, status: 'READY' }, correlationId: context.correlationId, actor: context.actor });
    let ready!: Quote;
    await this.uow.run(async (tx) => {
      ready = await this.quotes.transitionStatus(context.organizationId, quote.id, quote.currentVersion, ['DRAFT', 'INTERNAL_REVIEW', 'REVISION_REQUIRED'], 'READY', now, tx);
      await this.events.append(event, tx);
      await this.audit.append({ organizationId: context.organizationId, actor: context.actor, entityType: 'Quote', entityId: quote.id, action: 'READY', beforeData: { status: quote.status }, afterData: { status: 'READY', quoteVersionNumber: quote.currentVersion, total: version.total, taxAmount: version.taxAmount, discountAmount: version.discountAmount, marginBps: version.marginBps }, correlationId: context.correlationId }, tx);
    });
    return { ...ready, versions };
  }
}

export class SendQuoteService {
  constructor(private readonly uow: UnitOfWork, private readonly quotes: QuoteRepository, private readonly events: DomainEventStore, private readonly audit: AuditStore) {}

  async execute(quoteId: string, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.send')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.send permission.');
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    if (quote.status === 'SENT') return { ...quote, versions: await this.quotes.listVersions(context.organizationId, quote.id) };
    if (quote.status !== 'READY') throw new DomainError('QUOTE.STATUS_CONFLICT', 'Only a READY Quote can be marked SENT.');
    const versions = await this.quotes.listVersions(context.organizationId, quote.id);
    const version = versions.find((item) => item.versionNumber === quote.currentVersion);
    if (!version) throw new DomainError('QUOTE.VERSION_NOT_FOUND', 'Current Quote version was not found.');
    const now = new Date();
    const event = newDomainEvent({ organizationId: context.organizationId, eventType: 'QuoteSent', aggregateType: 'Quote', aggregateId: quote.id, payload: { quoteId: quote.id, quoteVersionNumber: quote.currentVersion, total: version.total, currency: quote.currency, status: 'SENT' }, correlationId: context.correlationId, actor: context.actor });
    let sent!: Quote;
    await this.uow.run(async (tx) => {
      sent = await this.quotes.transitionStatus(context.organizationId, quote.id, quote.currentVersion, ['READY'], 'SENT', now, tx);
      await this.events.append(event, tx);
      await this.audit.append({ organizationId: context.organizationId, actor: context.actor, entityType: 'Quote', entityId: quote.id, action: 'SENT', beforeData: { status: 'READY' }, afterData: { status: 'SENT', quoteVersionNumber: quote.currentVersion, total: version.total }, correlationId: context.correlationId }, tx);
    });
    return { ...sent, versions };
  }
}

export class ReadQuoteService {
  constructor(private readonly quotes: QuoteRepository) {}

  async byId(quoteId: string, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.read')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.read permission.');
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    return { ...quote, versions: await this.quotes.listVersions(context.organizationId, quoteId) };
  }
}
