import type { CustomerAccount, CustomerAccountRepository, CustomerLinkRepository } from '@avitus/customers';
import type {
  ApproveQuoteDiscountService,
  CreateQuoteService,
  QuoteBuyerSnapshot,
  QuoteRepository,
  ReadyQuoteService,
  ReviseQuoteService,
  SendQuoteService,
} from '@avitus/quotes';
import type { RequestContext } from '@avitus/shared';
import { z } from 'zod';

const createBuyerSourceSchema = z.object({ opportunityId: z.string().uuid() }).passthrough();

function preferredContact(account: CustomerAccount, type: 'EMAIL' | 'PHONE') {
  return account.contacts.find((contact) => contact.contactType === type && contact.isPrimary)
    ?? account.contacts.find((contact) => contact.contactType === type)
    ?? (type === 'PHONE'
      ? account.contacts.find((contact) => contact.contactType === 'WHATSAPP' && contact.isPrimary)
        ?? account.contacts.find((contact) => contact.contactType === 'WHATSAPP')
      : undefined);
}

function toBuyerSnapshot(account: CustomerAccount): QuoteBuyerSnapshot {
  const email = preferredContact(account, 'EMAIL');
  const phone = preferredContact(account, 'PHONE');
  return {
    customerAccountId: account.id,
    subjectType: account.subject.kind,
    displayName: account.subject.displayName,
    preferredLanguage: account.preferredLanguage,
    ...(email ? { email: email.value } : {}),
    ...(phone ? { phone: phone.value } : {}),
    ...(account.subject.kind === 'COMPANY' ? { legalName: account.subject.legalName } : {}),
    ...(account.subject.kind === 'COMPANY' && account.subject.taxId ? { taxId: account.subject.taxId } : {}),
  };
}

/**
 * API application orchestration for Quote governance.
 * `quotes` owns immutable commercial rules; this layer resolves current CustomerAccount truth
 * without making the quotes module depend directly on the customers module.
 */
export class QuoteGovernanceService {
  constructor(
    private readonly customers: CustomerAccountRepository,
    private readonly customerLinks: CustomerLinkRepository,
    private readonly quotes: QuoteRepository,
    private readonly createQuote: CreateQuoteService,
    private readonly reviseQuote: ReviseQuoteService,
    private readonly approveDiscount: ApproveQuoteDiscountService,
    private readonly readyQuote: ReadyQuoteService,
    private readonly sendQuote: SendQuoteService,
  ) {}

  private async snapshotForOpportunity(
    opportunityId: string,
    context: RequestContext,
  ): Promise<QuoteBuyerSnapshot | undefined> {
    const customerAccountId = await this.customerLinks.findForOpportunity(context.organizationId, opportunityId);
    if (!customerAccountId) return undefined;
    const account = await this.customers.findById(context.organizationId, customerAccountId);
    return account ? toBuyerSnapshot(account) : undefined;
  }

  async create(rawInput: unknown, context: RequestContext) {
    const parsed = createBuyerSourceSchema.safeParse(rawInput);
    const buyer = parsed.success ? await this.snapshotForOpportunity(parsed.data.opportunityId, context) : undefined;
    return this.createQuote.execute(rawInput, context, buyer);
  }

  async revise(quoteId: string, rawInput: unknown, context: RequestContext) {
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    const buyer = quote ? await this.snapshotForOpportunity(quote.opportunityId, context) : undefined;
    return this.reviseQuote.execute(quoteId, rawInput, context, buyer);
  }

  approve(quoteId: string, context: RequestContext) {
    return this.approveDiscount.execute(quoteId, context);
  }

  async ready(quoteId: string, context: RequestContext) {
    const quote = await this.quotes.findById(context.organizationId, quoteId);
    const linkedCustomerAccountId = quote
      ? await this.customerLinks.findForOpportunity(context.organizationId, quote.opportunityId)
      : null;
    return this.readyQuote.execute(quoteId, linkedCustomerAccountId, context);
  }

  sent(quoteId: string, context: RequestContext) {
    return this.sendQuote.execute(quoteId, context);
  }
}
