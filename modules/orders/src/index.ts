import { randomUUID } from 'node:crypto';
import type { AuditStore } from '@avitus/audit';
import type { CustomerLinkRepository } from '@avitus/customers';
import {
  executorFrom,
  orders,
  projects,
  quoteAcceptances,
  type DbExecutor,
} from '@avitus/database';
import type { DomainEventStore } from '@avitus/events';
import type { Quote, QuoteBuyerSnapshot, QuoteDetail, QuoteRepository, QuoteVersion } from '@avitus/quotes';
import {
  DomainError,
  newDomainEvent,
  type RequestContext,
  type TransactionContext,
  type UnitOfWork,
} from '@avitus/shared';
import { and, eq } from 'drizzle-orm';

export type OrderStatus = 'CONFIRMED' | 'ON_HOLD' | 'CANCELLED' | 'COMPLETED';
export type ProjectStatus = 'PLANNING' | 'READY' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export interface QuoteAcceptance {
  quoteId: string;
  organizationId: string;
  quoteVersionNumber: number;
  acceptedAt: Date;
  acceptedByActorType: string;
  acceptedByActorId: string;
}

export interface Order {
  id: string;
  organizationId: string;
  orderNumber: string;
  quoteId: string;
  quoteVersionNumber: number;
  opportunityId: string;
  customerAccountId: string;
  configurationId: string;
  currency: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
  estimatedCost: string;
  marginAmount: string;
  marginBps: number;
  buyerSnapshot: QuoteBuyerSnapshot;
  status: OrderStatus;
  createdByUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  organizationId: string;
  orderId: string;
  configurationId: string;
  name: string;
  status: ProjectStatus;
  ownerUserId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderProjectDetail {
  order: Order;
  project: Project;
}

export interface OrderRepository {
  insertAcceptance(acceptance: QuoteAcceptance, tx?: TransactionContext): Promise<void>;
  findAcceptance(organizationId: string, quoteId: string): Promise<QuoteAcceptance | null>;
  insertOrderProject(order: Order, project: Project, tx?: TransactionContext): Promise<void>;
  findOrderById(organizationId: string, orderId: string): Promise<Order | null>;
  findOrderByQuote(organizationId: string, quoteId: string): Promise<Order | null>;
  findProjectById(organizationId: string, projectId: string): Promise<Project | null>;
  findProjectByOrder(organizationId: string, orderId: string): Promise<Project | null>;
}

function buyerSnapshotFromJson(value: unknown): QuoteBuyerSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('ORDER.BUYER_SNAPSHOT_INVALID', 'Order buyer snapshot is invalid.');
  }
  const row = value as Record<string, unknown>;
  if (
    typeof row.customerAccountId !== 'string' ||
    (row.subjectType !== 'PERSON' && row.subjectType !== 'COMPANY') ||
    typeof row.displayName !== 'string' ||
    typeof row.preferredLanguage !== 'string'
  ) {
    throw new DomainError('ORDER.BUYER_SNAPSHOT_INVALID', 'Order buyer snapshot is invalid.');
  }
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

function acceptanceFromRow(row: typeof quoteAcceptances.$inferSelect): QuoteAcceptance {
  return {
    quoteId: row.quoteId,
    organizationId: row.organizationId,
    quoteVersionNumber: row.quoteVersionNumber,
    acceptedAt: row.acceptedAt,
    acceptedByActorType: row.acceptedByActorType,
    acceptedByActorId: row.acceptedByActorId,
  };
}

function orderFromRow(row: typeof orders.$inferSelect): Order {
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderNumber: row.orderNumber,
    quoteId: row.quoteId,
    quoteVersionNumber: row.quoteVersionNumber,
    opportunityId: row.opportunityId,
    customerAccountId: row.customerAccountId,
    configurationId: row.configurationId,
    currency: row.currency,
    subtotal: row.subtotal,
    discountAmount: row.discountAmount,
    taxAmount: row.taxAmount,
    total: row.total,
    estimatedCost: row.estimatedCost,
    marginAmount: row.marginAmount,
    marginBps: row.marginBps,
    buyerSnapshot: buyerSnapshotFromJson(row.buyerSnapshot),
    status: row.status,
    ...(row.createdByUserId ? { createdByUserId: row.createdByUserId } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function projectFromRow(row: typeof projects.$inferSelect): Project {
  return {
    id: row.id,
    organizationId: row.organizationId,
    orderId: row.orderId,
    configurationId: row.configurationId,
    name: row.name,
    status: row.status,
    ...(row.ownerUserId ? { ownerUserId: row.ownerUserId } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly db: DbExecutor) {}

  async insertAcceptance(acceptance: QuoteAcceptance, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(quoteAcceptances).values({
      quoteId: acceptance.quoteId,
      organizationId: acceptance.organizationId,
      quoteVersionNumber: acceptance.quoteVersionNumber,
      acceptedAt: acceptance.acceptedAt,
      acceptedByActorType: acceptance.acceptedByActorType,
      acceptedByActorId: acceptance.acceptedByActorId,
    });
  }

  async findAcceptance(organizationId: string, quoteId: string): Promise<QuoteAcceptance | null> {
    const rows = await this.db
      .select()
      .from(quoteAcceptances)
      .where(and(eq(quoteAcceptances.organizationId, organizationId), eq(quoteAcceptances.quoteId, quoteId)))
      .limit(1);
    return rows[0] ? acceptanceFromRow(rows[0]) : null;
  }

  async insertOrderProject(order: Order, project: Project, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(orders).values({
      id: order.id,
      organizationId: order.organizationId,
      orderNumber: order.orderNumber,
      quoteId: order.quoteId,
      quoteVersionNumber: order.quoteVersionNumber,
      opportunityId: order.opportunityId,
      customerAccountId: order.customerAccountId,
      configurationId: order.configurationId,
      currency: order.currency,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      total: order.total,
      estimatedCost: order.estimatedCost,
      marginAmount: order.marginAmount,
      marginBps: order.marginBps,
      buyerSnapshot: order.buyerSnapshot,
      status: order.status,
      createdByUserId: order.createdByUserId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
    await executor.insert(projects).values({
      id: project.id,
      organizationId: project.organizationId,
      orderId: project.orderId,
      configurationId: project.configurationId,
      name: project.name,
      status: project.status,
      ownerUserId: project.ownerUserId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  }

  async findOrderById(organizationId: string, orderId: string): Promise<Order | null> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.organizationId, organizationId), eq(orders.id, orderId)))
      .limit(1);
    return rows[0] ? orderFromRow(rows[0]) : null;
  }

  async findOrderByQuote(organizationId: string, quoteId: string): Promise<Order | null> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.organizationId, organizationId), eq(orders.quoteId, quoteId)))
      .limit(1);
    return rows[0] ? orderFromRow(rows[0]) : null;
  }

  async findProjectById(organizationId: string, projectId: string): Promise<Project | null> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, organizationId), eq(projects.id, projectId)))
      .limit(1);
    return rows[0] ? projectFromRow(rows[0]) : null;
  }

  async findProjectByOrder(organizationId: string, orderId: string): Promise<Project | null> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.organizationId, organizationId), eq(projects.orderId, orderId)))
      .limit(1);
    return rows[0] ? projectFromRow(rows[0]) : null;
  }
}

function currentVersion(quote: Quote, versions: QuoteVersion[]): QuoteVersion {
  const version = versions.find((item) => item.versionNumber === quote.currentVersion);
  if (!version) throw new DomainError('QUOTE.VERSION_NOT_FOUND', 'Current Quote version was not found.');
  return version;
}

function assertGovernedForAcceptance(version: QuoteVersion): void {
  if (!version.buyerSnapshot) throw new DomainError('QUOTE.BUYER_REQUIRED', 'Quote has no governed buyer snapshot.');
  if (version.taxRateBps === undefined) throw new DomainError('QUOTE.TAX_POLICY_REQUIRED', 'Quote has no explicit tax policy.');
  if (!version.validUntil) throw new DomainError('QUOTE.VALID_UNTIL_REQUIRED', 'Quote validity date is required.');
  if (version.validUntil < new Date().toISOString().slice(0, 10)) throw new DomainError('QUOTE.EXPIRED_VALIDITY', 'Expired Quote cannot be accepted.');
}

export class AcceptQuoteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly quotes: QuoteRepository,
    private readonly orders: OrderRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(quoteId: string, context: RequestContext): Promise<QuoteDetail> {
    if (!context.permissions.has('quote.accept')) throw new DomainError('AUTH.FORBIDDEN', 'Missing quote.accept permission.');
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    const versions = await this.quotes.listVersions(context.organizationId, quoteId);
    const version = currentVersion(quote, versions);

    const existingAcceptance = await this.orders.findAcceptance(context.organizationId, quoteId);
    if (quote.status === 'ACCEPTED') {
      if (existingAcceptance?.quoteVersionNumber === quote.currentVersion) return { ...quote, versions };
      throw new DomainError('QUOTE.ACCEPTANCE_CONFLICT', 'Accepted Quote is missing matching acceptance truth.');
    }
    if (quote.status !== 'SENT') throw new DomainError('QUOTE.STATUS_CONFLICT', 'Only a SENT Quote can be accepted.');
    if (existingAcceptance) throw new DomainError('QUOTE.ACCEPTANCE_CONFLICT', 'Quote already has an acceptance record.');
    assertGovernedForAcceptance(version);

    const now = new Date();
    const acceptance: QuoteAcceptance = {
      quoteId: quote.id,
      organizationId: context.organizationId,
      quoteVersionNumber: quote.currentVersion,
      acceptedAt: now,
      acceptedByActorType: context.actor.type,
      acceptedByActorId: context.actor.id,
    };
    const event = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'QuoteAccepted',
      aggregateType: 'Quote',
      aggregateId: quote.id,
      payload: {
        quoteId: quote.id,
        quoteVersionNumber: quote.currentVersion,
        total: version.total,
        currency: quote.currency,
        status: 'ACCEPTED',
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    let accepted!: Quote;
    await this.uow.run(async (tx) => {
      accepted = await this.quotes.transitionStatus(
        context.organizationId,
        quote.id,
        quote.currentVersion,
        ['SENT'],
        'ACCEPTED',
        now,
        tx,
      );
      await this.orders.insertAcceptance(acceptance, tx);
      await this.events.append(event, tx);
      await this.audit.append({
        organizationId: context.organizationId,
        actor: context.actor,
        entityType: 'Quote',
        entityId: quote.id,
        action: 'ACCEPT',
        beforeData: { status: 'SENT' },
        afterData: {
          status: 'ACCEPTED',
          quoteVersionNumber: quote.currentVersion,
          total: version.total,
          currency: quote.currency,
        },
        correlationId: context.correlationId,
      }, tx);
    });
    return { ...accepted, versions };
  }
}

function makeOrderNumber(now: Date, id: string): string {
  const day = now.toISOString().slice(0, 10).replaceAll('-', '');
  return `AM-${day}-${id.slice(0, 8).toUpperCase()}`;
}

export class CreateOrderFromAcceptedQuoteService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly quotes: QuoteRepository,
    private readonly customerLinks: CustomerLinkRepository,
    private readonly orders: OrderRepository,
    private readonly events: DomainEventStore,
    private readonly audit: AuditStore,
  ) {}

  async execute(quoteId: string, context: RequestContext): Promise<OrderProjectDetail> {
    if (!context.permissions.has('order.create')) throw new DomainError('AUTH.FORBIDDEN', 'Missing order.create permission.');
    const already = await this.orders.findOrderByQuote(context.organizationId, quoteId);
    if (already) {
      const project = await this.orders.findProjectByOrder(context.organizationId, already.id);
      if (!project) throw new DomainError('PROJECT.NOT_FOUND', 'Order exists without its Project.');
      return { order: already, project };
    }

    const quote = await this.quotes.findById(context.organizationId, quoteId);
    if (!quote) throw new DomainError('QUOTE.NOT_FOUND', 'Quote was not found.');
    if (quote.status !== 'ACCEPTED') throw new DomainError('ORDER.QUOTE_NOT_ACCEPTED', 'Only an ACCEPTED Quote can create an Order.');
    const acceptance = await this.orders.findAcceptance(context.organizationId, quote.id);
    if (!acceptance || acceptance.quoteVersionNumber !== quote.currentVersion) {
      throw new DomainError('ORDER.ACCEPTANCE_INTEGRITY', 'Quote acceptance does not match the current Quote version.');
    }
    const versions = await this.quotes.listVersions(context.organizationId, quote.id);
    const version = currentVersion(quote, versions);
    if (!version.buyerSnapshot) throw new DomainError('ORDER.BUYER_SNAPSHOT_REQUIRED', 'Accepted Quote version has no buyer snapshot.');
    const linkedCustomerAccountId = await this.customerLinks.findForOpportunity(context.organizationId, quote.opportunityId);
    if (linkedCustomerAccountId !== version.buyerSnapshot.customerAccountId) {
      throw new DomainError('ORDER.CUSTOMER_MISMATCH', 'Current Opportunity customer differs from the accepted Quote buyer. Manual review is required.');
    }

    const now = new Date();
    const orderId = randomUUID();
    const projectId = randomUUID();
    const order: Order = {
      id: orderId,
      organizationId: context.organizationId,
      orderNumber: makeOrderNumber(now, orderId),
      quoteId: quote.id,
      quoteVersionNumber: acceptance.quoteVersionNumber,
      opportunityId: quote.opportunityId,
      customerAccountId: version.buyerSnapshot.customerAccountId,
      configurationId: quote.configurationId,
      currency: quote.currency,
      subtotal: version.subtotal,
      discountAmount: version.discountAmount,
      taxAmount: version.taxAmount,
      total: version.total,
      estimatedCost: version.estimatedCost,
      marginAmount: version.marginAmount,
      marginBps: version.marginBps,
      buyerSnapshot: version.buyerSnapshot,
      status: 'CONFIRMED',
      ...(context.actor.type === 'USER' ? { createdByUserId: context.actor.id } : {}),
      createdAt: now,
      updatedAt: now,
    };
    const project: Project = {
      id: projectId,
      organizationId: context.organizationId,
      orderId,
      configurationId: quote.configurationId,
      name: `Projekt ${order.orderNumber}`,
      status: 'PLANNING',
      createdAt: now,
      updatedAt: now,
    };
    const orderEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'OrderCreated',
      aggregateType: 'Order',
      aggregateId: order.id,
      payload: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        quoteId: quote.id,
        quoteVersionNumber: order.quoteVersionNumber,
        total: order.total,
        currency: order.currency,
        status: order.status,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });
    const projectEvent = newDomainEvent({
      organizationId: context.organizationId,
      eventType: 'ProjectCreated',
      aggregateType: 'Project',
      aggregateId: project.id,
      payload: {
        projectId: project.id,
        orderId: order.id,
        configurationId: project.configurationId,
        status: project.status,
      },
      correlationId: context.correlationId,
      actor: context.actor,
    });

    try {
      await this.uow.run(async (tx) => {
        await this.orders.insertOrderProject(order, project, tx);
        await this.events.append(orderEvent, tx);
        await this.events.append(projectEvent, tx);
        await this.audit.append({
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Order',
          entityId: order.id,
          action: 'CREATE_FROM_ACCEPTED_QUOTE',
          afterData: {
            orderNumber: order.orderNumber,
            quoteId: quote.id,
            quoteVersionNumber: order.quoteVersionNumber,
            total: order.total,
            currency: order.currency,
            status: order.status,
          },
          correlationId: context.correlationId,
        }, tx);
        await this.audit.append({
          organizationId: context.organizationId,
          actor: context.actor,
          entityType: 'Project',
          entityId: project.id,
          action: 'CREATE_FROM_ORDER',
          afterData: {
            orderId: order.id,
            configurationId: project.configurationId,
            status: project.status,
          },
          correlationId: context.correlationId,
        }, tx);
      });
      return { order, project };
    } catch (error) {
      const concurrent = await this.orders.findOrderByQuote(context.organizationId, quoteId);
      if (concurrent) {
        const concurrentProject = await this.orders.findProjectByOrder(context.organizationId, concurrent.id);
        if (concurrentProject) return { order: concurrent, project: concurrentProject };
      }
      throw error;
    }
  }
}

export class ReadOrderService {
  constructor(private readonly orders: OrderRepository) {}
  async byId(orderId: string, context: RequestContext): Promise<Order> {
    if (!context.permissions.has('order.read')) throw new DomainError('AUTH.FORBIDDEN', 'Missing order.read permission.');
    const order = await this.orders.findOrderById(context.organizationId, orderId);
    if (!order) throw new DomainError('ORDER.NOT_FOUND', 'Order was not found.');
    return order;
  }
}

export class ReadProjectService {
  constructor(private readonly orders: OrderRepository) {}
  async byId(projectId: string, context: RequestContext): Promise<Project> {
    if (!context.permissions.has('project.read')) throw new DomainError('AUTH.FORBIDDEN', 'Missing project.read permission.');
    const project = await this.orders.findProjectById(context.organizationId, projectId);
    if (!project) throw new DomainError('PROJECT.NOT_FOUND', 'Project was not found.');
    return project;
  }
}
