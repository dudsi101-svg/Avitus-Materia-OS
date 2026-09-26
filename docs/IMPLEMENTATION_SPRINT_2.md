# Avitus Materia OS — Implementation Sprint 2

## Goal
Build the first reliable commercial pricing/quote source of truth on top of the versioned Product Configuration foundation.

Canonical slice:

`ConfigurationVersion -> PriceCalculation -> CostComponents -> Quote -> QuoteVersion -> QuoteItem`

This sprint intentionally stops at an internal **DRAFT Quote**. READY/SENT/customer acceptance, tax policy, discount approvals and communication delivery require separate business-policy slices.

## Invariants
1. Money is decimal, persisted as `NUMERIC(19,4)` and represented at domain boundaries as decimal strings. Business arithmetic must not use binary floating point.
2. A `PriceCalculation` is immutable and pinned to one exact `ConfigurationVersion`.
3. A Quote/QuoteVersion may use only a PriceCalculation for the Configuration's current version.
4. Revising Configuration invalidates old pricing for future Quote versions. Attempting to use it returns `QUOTE.STALE_PRICE_CALCULATION`.
5. Quote versions are append-only. Earlier versions are never overwritten.
6. Quote revision uses an optimistic version guard to reject concurrent revisions with `QUOTE.VERSION_CONFLICT`.
7. Pricing and Quote reads are organization-scoped and return safe not-found boundaries across organizations.
8. PriceCalculation/Quote writes persist business state + audit + semantic domain event + transactional outbox intent in one Unit of Work.
9. Quote v1 stores a snapshot of pricing evidence; it does not depend on a mutable price later.
10. Sprint 2 does not claim a legally/fiscally final quote. Tax is zero in DRAFT until tax policy exists.

## Pricing algorithm v1
Algorithm id: `cost-plus-margin-v1`.

Inputs:
- current ConfigurationVersion snapshot
- ISO 4217-style 3-letter currency code
- target margin in basis points
- explicit cost components

Component types:
- MATERIAL
- LABOR
- MACHINE
- OUTSOURCING
- TRANSPORT
- PACKAGING
- FINISH
- OTHER

Formula:

`recommended price = total cost / (1 - target margin)`

The implementation uses fixed 1/10,000 currency units backed by `BigInt` and rounds the recommended price upward to the next 4-decimal unit when division is not exact.

Example:
- cost = 7,500.0000
- target margin = 4,000 bps (40%)
- recommended price = 12,500.0000

## Quote MVP
A Quote contains Opportunity, Configuration, currency and current version. Each QuoteVersion stores:
- PriceCalculation reference
- Configuration version number
- subtotal / total
- zero discount and tax for this internal DRAFT slice
- estimated cost
- margin amount / target margin basis points
- pricing snapshot
- optional validity date
- revision reason
- one QuoteItem for the configured product in Sprint 2

Quote numbers use a collision-resistant non-sequential MVP format: `Q-YYYY-<UUID8>`. Formal/legal numbering policy can replace this through a dedicated versioned policy later.

## API
- `POST /pricing/calculations`
- `GET /pricing/calculations/:id`
- `POST /quotes`
- `GET /quotes/:id`
- `POST /quotes/:id/versions`

## RBAC
- `pricing.calculation.read`
- `pricing.calculation.create`
- `quote.read`
- `quote.create`

## Validation / Definition of Done
CI must pass with `pnpm install --frozen-lockfile`, all migrations and seed, boundary lint, typecheck, tests and build.

Automated tests must prove:
1. exact decimal pricing arithmetic,
2. full Lead -> Opportunity -> Configuration -> Pricing -> Quote path,
3. PriceCalculation audit/domain-event/outbox persistence,
4. Quote creation and immutable v1 snapshot,
5. stale PriceCalculation rejected after Configuration revision,
6. new pricing creates Quote v2 while v1 remains unchanged,
7. cross-organization PriceCalculation/Quote reads return 404,
8. malformed money is rejected through structured validation.

## Explicit non-goals
- discounts / discount approval matrix
- tax/VAT policy
- quote READY/SENT/VIEWED/ACCEPTED transitions
- PDF generation
- customer portal acceptance
- production reservation
- payment schedules
- AI-driven autonomous pricing

Those capabilities build on this source-of-truth foundation rather than bypassing it.
