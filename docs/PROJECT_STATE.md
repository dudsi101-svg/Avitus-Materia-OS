# Avitus Materia OS — Project State

**Checkpoint:** 3 — Sprint 2 pricing / draft quote foundation validated
**Date:** 2026-09-26
**Status:** Sprints 0–1 are merged to `main`. Sprint 2 is implemented on `sprint-2/pricing-quotes`; PR #3 awaits final CI after the documentation checkpoint and merge.

## Identity
- Brand: **Avitus Materia**
- Main domain: **Avitus-Materia.com**
- Repository: `dudsi101-svg/Avitus-Materia-OS`
- Previous brand: Drakkar — legacy/history only; do not embed it into new Core names.

## Product definition
Avitus Materia OS is the central AI-native Operating & Sales System for custom manufacturing.

Canonical value flow:

`MARKET -> CONTENT -> LEAD -> CUSTOMER -> CONFIGURATION -> QUOTE -> ORDER -> PROJECT -> MATERIAL -> PRODUCTION -> DELIVERY -> FINANCE -> RELATIONSHIP -> DATA -> AUTOMATION -> AI`

Core principle:

**DATA TRUTH -> AUTOMATION -> INTELLIGENCE**

## Architecture baseline
- monorepo + modular monolith
- TypeScript / Node.js
- Next.js admin Command Center
- NestJS API composition root
- PostgreSQL source of truth
- Drizzle SQL-first typed data access
- Zod boundary validation
- organization scoping from day one
- RBAC foundation
- append-oriented audit history
- semantic domain events + transactional PostgreSQL outbox
- development-only auth adapter forbidden in production
- no arbitrary AI database access
- important commercial facts are version/snapshot oriented rather than destructively overwritten
- monetary values are decimal source-of-truth values; business price arithmetic does not use binary floating point

## Sprint 0 — merged foundation
Validated flow:

`Authenticated user context -> Organization -> Lead -> AuditEvent + DomainEvent + Outbox -> Admin`

Established monorepo/tooling, API/admin composition roots, PostgreSQL, migrations/seed, organization-aware IAM/RBAC, Lead vertical slice, audit/domain events/outbox, structured errors, health/readiness, tenant-isolation tests, frozen lockfile and CI.

## Sprint 1 — merged sales/configuration foundation
Validated flow:

`Lead -> Opportunity -> Product -> Configuration -> ConfigurationVersion`

Established:
- organization-scoped Opportunity
- ProductFamily / Product / ProductOptionDefinition catalog
- versioned Configuration with immutable ConfigurationVersion snapshots
- option type/range/choice/required validation
- `INCOMPLETE` vs `READY_FOR_PRICING`
- organization isolation through CRM/catalog/configurator
- audit/domain-event/outbox persistence
- admin Command Center path through Opportunity and Configuration

## Sprint 2 — pricing and internal draft quote source of truth
Validated flow:

`ConfigurationVersion -> PriceCalculation -> CostComponents -> Quote -> QuoteVersion -> QuoteItem`

Implemented on `sprint-2/pricing-quotes`:
- `modules/pricing`
- `modules/quotes`
- `price_calculations` + `cost_components`
- `quotes` + immutable `quote_versions` + `quote_items`
- SQL migration `0002_pricing_quotes.sql`
- exact fixed-scale 4-decimal monetary arithmetic backed by BigInt
- pricing algorithm version `cost-plus-margin-v1`
- explicit cost-component categories: MATERIAL, LABOR, MACHINE, OUTSOURCING, TRANSPORT, PACKAGING, FINISH, OTHER
- PriceCalculation pinned to exact ConfigurationVersion ID + number
- pricing input/output snapshots for historical explainability
- Quote DRAFT created from one current PriceCalculation
- QuoteVersion snapshots retain price, estimated cost, margin, pricing evidence and configuration version
- QuoteItem snapshots retain configured product, quantity and commercial/economic values
- `QUOTE.STALE_PRICE_CALCULATION` guard when Configuration changed after pricing
- `QUOTE.VERSION_CONFLICT` optimistic guard for concurrent quote revision
- quote revision appends v2/v3 rather than overwriting history
- quote currency preserved across revisions
- RBAC permissions for pricing and quotes
- organization-scoped pricing/quote reads
- pricing and quote HTTP APIs
- Command Center UI through Configuration -> Pricing -> Draft Quote
- exact-arithmetic unit tests
- full Sprint 2 API E2E test
- refreshed pnpm lockfile and frozen-lockfile CI

## Sprint 2 validation
The CI path has demonstrated:
- `pnpm install --frozen-lockfile`
- migrations `0000`, `0001`, `0002`
- development seed including new RBAC permissions
- module-boundary lint
- TypeScript typecheck
- existing Sprint 0 / Sprint 1 tests
- pricing arithmetic tests
- Pricing/Quote API E2E tests
- production build

Sprint 2 tests prove:
1. 7,500.0000 cost at 40% target margin gives 12,500.0000 without floating-point drift,
2. PriceCalculation is pinned to Configuration v1,
3. Quote v1 stores a commercial/economic snapshot,
4. Configuration revision to v2 makes v1 pricing stale for any new Quote version,
5. stale pricing is rejected with `QUOTE.STALE_PRICE_CALCULATION`,
6. repricing v2 allows Quote v2 while Quote v1 remains unchanged,
7. malformed money is rejected through the structured validation boundary,
8. another organization receives safe 404 boundaries for pricing/quote data.

## Security / isolation decisions enforced
- Business reads require explicit `organizationId`.
- Lead, Opportunity, Product, Configuration, PriceCalculation and Quote lookup boundaries are organization-scoped.
- Development auth validates active organization membership and cannot run in production.
- RBAC gates each implemented business domain.
- Audit/domain events carry organization, actor and correlation context.
- Critical Pricing/Quote writes share one Unit of Work with audit + event/outbox persistence.

## Deliberate current limitations
1. External production identity provider is not selected/connected yet; production rejects development auth mode.
2. Outbox persistence exists; publisher/worker delivery is not implemented yet.
3. Production observability is not implemented beyond health/readiness, correlation IDs and CI diagnostics.
4. Quotes are **internal DRAFTS only**. Tax/VAT policy, discounts, approvals, READY/SENT/VIEWED/ACCEPTED transitions and documents are intentionally not claimed yet.
5. Quote numbering is collision-resistant MVP (`Q-YYYY-<UUID8>`), not a final fiscal/legal numbering policy.
6. AI may not autonomously price or bind the business to price/date commitments.
7. Customer-facing room photo analysis, visualization and customer portal are not implemented yet.
8. Capacity/availability truth is not implemented; the system must not promise production/delivery dates from guesswork.

## Customer-facing strategic pillar
The AI Product Configurator remains a first-class system surface. Product/Configuration/Pricing are now stable enough to begin the first customer-facing slice without creating a parallel truth model. AI/visualization will operate through controlled services and versioned Configuration rather than writing arbitrary commercial state.

## Future partner network
Core remains organization-aware to preserve the path to Partner Organizations, capability registry, Work Orders, scoped partner portal and distributed manufacturing orchestration.

## Next engineering sequence
1. Merge PR #3 only after final CI is green.
2. Sprint 3: commercial policy around Quote — discount/margin approval, tax/VAT calculation policy and controlled Quote transitions up to READY.
3. Introduce a document representation for Quote without making PDF the source of truth.
4. Add customer-facing read/approve boundaries only after visibility rules are explicit.
5. In parallel, prepare the first customer configurator application on Product/Configuration/Pricing services.
6. Before customer delivery promises, implement BusinessCalendar + capacity/availability estimate source of truth.
7. Then extend toward Order creation from accepted Quote.

## Project memory rule
GitHub documentation is the durable project memory. Material architectural/product decisions must be reflected in repository docs rather than relying on chat history alone.
