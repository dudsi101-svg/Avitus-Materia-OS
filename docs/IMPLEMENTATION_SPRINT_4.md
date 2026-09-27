# Avitus Materia OS — Implementation Sprint 4

## Why this sprint moved ahead of Quote governance
After Sprint 2 the system could create a versioned configuration, calculate an explainable price and create an immutable DRAFT Quote — but there was no durable buyer identity in the implemented Core.

Moving directly to VAT, discounts or `READY/SENT` would therefore create a false commercial state: a quote could be technically "ready" without an authoritative answer to **who is buying and how that party is contacted**.

Sprint 4 closes that gap before Quote governance.

## Goal
Establish customer/party identity as a first-class organization-scoped source of truth and link it explicitly to the sales chain.

Canonical slice:

`Person | Company -> CustomerAccount -> ContactPoint -> Lead / Opportunity`

Quote buyer snapshots and READY/SENT policy will consume this source of truth in the following commercial-governance sprint.

## Domain model
### Person
A human identity scoped to one organization implementation.

Required MVP fields:
- first name
- last name
- display name

### Company
A B2B/legal party.

MVP fields:
- legal name
- display name
- optional tax identifier

The Sprint does not pretend that tax ID syntax is globally uniform; market-specific validation comes through policy/integration later.

### CustomerAccount
Represents the commercial relationship rather than the raw person/company record.

Types:
- B2C
- B2B
- ARCHITECT
- PARTNER
- DEALER
- OTHER

Statuses:
- PROSPECT
- ACTIVE
- VIP
- DORMANT
- AT_RISK
- BLOCKED
- ARCHIVED

Exactly one subject is required: Person **or** Company.

### ContactPoint
Types:
- EMAIL
- PHONE
- WHATSAPP
- OTHER

Contact values preserve the operator-entered value and a normalized lookup value.

MVP normalization:
- e-mail -> trimmed lowercase, syntactically validated
- phone/WhatsApp -> international E.164-style `+...` canonical form
- `00` international prefix is normalized to `+`

At most one primary contact per account/contact type is allowed by a partial database unique index. If a type has no explicit primary in a create command, the first contact of that type becomes primary.

## Sales links
Customer identity is not hidden inside Lead title/notes.

Explicit link records:
- `Lead -> CustomerAccount`
- `Opportunity -> CustomerAccount`

Rules:
1. links are organization-scoped in application code **and in composite database foreign keys**;
2. one Lead/Opportunity has at most one current CustomerAccount in Sprint 4;
3. binding the same account again is idempotent;
4. rebinding to a different account is blocked rather than silently replacing commercial identity;
5. future controlled merge/reassignment needs its own permission + reason + audit workflow.

## Privacy / audit rule
Contact values are PII. The customer record stores them because they are business data, but audit/event payloads for creation record contact **types**, not raw e-mail/phone values.

This avoids copying PII unnecessarily into append-oriented audit/event streams.

## API
- `POST /customers/person-accounts`
- `POST /customers/company-accounts`
- `GET /customers`
- `GET /customers/:id`
- `GET /customers/for-lead/:leadId`
- `GET /customers/for-opportunity/:opportunityId`
- `POST /customers/:id/link/lead/:leadId`
- `POST /customers/:id/link/opportunity/:opportunityId`

## RBAC
- `customer.account.read`
- `customer.account.write`
- `customer.link.write`

## Persistence
Migration `0004_customer_identity.sql` adds:
- `persons`
- `companies`
- `customer_accounts`
- `contact_points`
- `lead_customer_accounts`
- `opportunity_customer_accounts`

Important database invariants:
- exactly one Person/Company subject per CustomerAccount;
- subject belongs to the same organization;
- contact belongs to an account in the same organization;
- Lead/Opportunity links use composite organization FKs;
- one primary contact per account/type;
- duplicate normalized value of the same type on one account is blocked.

## Events / audit
Semantic events:
- `CustomerAccountCreated`
- `CustomerLinkedToLead`
- `CustomerLinkedToOpportunity`

Creation and link mutations persist business state + AuditEvent + DomainEvent + outbox intent through the same Unit of Work when the mutation is new.

## Command Center
Sprint 4 adds an internal operator surface for:
- creating a B2C CustomerAccount,
- normalized e-mail/phone capture,
- binding it to a selected Lead and/or Opportunity,
- viewing the current customer register.

Company creation exists in API/domain tests; a richer B2B admin form can follow when B2B workflows require it.

## Definition of Done
CI must prove:
1. frozen-lockfile install;
2. migrations `0000` through `0004`;
3. development seed with customer permissions;
4. typecheck / boundary lint / all existing tests / production build;
5. email and phone normalization;
6. Person CustomerAccount creation with AuditEvent + DomainEvent + outbox;
7. Company CustomerAccount creation;
8. Lead and Opportunity customer links;
9. idempotent same-account link retry;
10. cross-organization account reads return 404;
11. a customer from Organization B cannot be linked to Organization A's Opportunity;
12. raw contact PII is not copied into CustomerAccount creation audit payload.

## Explicit non-goals
- customer merge/deduplication engine
- GDPR deletion/anonymization workflow
- addresses/billing/shipping profiles
- production auth/customer login
- customer portal
- quote buyer snapshot
- VAT/tax policy
- discounts/approval matrix
- quote READY/SENT transition
- e-mail sending

These follow after the identity source of truth exists.
