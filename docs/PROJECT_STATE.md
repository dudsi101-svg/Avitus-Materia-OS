# Avitus Materia OS — Project State

**Checkpoint:** 4 — Sprint 3 public website v0.1 + inquiry intake validated and merged
**Date:** 2026-09-26
**Status:** Sprints 0–3 are merged to `main`. PR #4 passed frozen-lockfile CI, migrations, seed, lint, typecheck, all tests and production build; post-merge CI on `main` is green.

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
- Next.js public web + admin Command Center
- NestJS API composition root
- PostgreSQL source of truth
- Drizzle SQL-first typed data access
- Zod boundary validation
- organization scoping from day one
- RBAC foundation
- append-oriented audit history
- semantic domain events + transactional PostgreSQL outbox
- development-only user auth adapter forbidden in production
- explicit public-route boundary with a separate server-to-server inquiry credential
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

## Sprint 2 — merged pricing / internal draft quote source of truth
Validated flow:

`ConfigurationVersion -> PriceCalculation -> CostComponents -> Quote -> QuoteVersion -> QuoteItem`

Established:
- exact fixed-scale 4-decimal monetary arithmetic backed by BigInt
- immutable PriceCalculation pinned to an exact ConfigurationVersion
- pricing input/output snapshots and cost-component history
- immutable QuoteVersion / QuoteItem snapshots
- stale-pricing guard after configuration revision
- optimistic Quote revision conflict guard
- organization-scoped Pricing/Quote API and RBAC
- admin flow through Configuration -> Pricing -> Draft Quote
- migration `0002_pricing_quotes.sql`
- unit + full API E2E coverage

## Sprint 3 — merged first customer-facing website
Validated flow:

`Public Website -> Next server route -> Public Inquiry API -> PublicInquirySubmission + CRM Lead -> Audit + Domain Events + Outbox`

Established:
- `apps/web` — first responsive Avitus Materia customer website
- public brand/positioning landing page for `Avitus-Materia.com`
- material/process/project/configurator/contact sections
- SEO/OpenGraph baseline
- customer inquiry form
- server-side website proxy; backend credential is never sent to browser JavaScript
- explicit `@PublicRoute()` mechanism in the API authentication guard
- separate constant-time checked server-to-server public-inquiry credential
- target organization controlled only by server configuration
- `modules/acquisition`
- immutable `public_inquiry_submissions` intake record preserving original contact/project information
- one transaction creates the CRM Lead, intake record, audit records, semantic events and outbox entries
- PII deliberately excluded from event/outbox/audit snapshots
- migration `0003_public_inquiry.sql`
- honeypot validation and API E2E coverage
- existing Sprint 0–2 tests protected against regression

## Sprint 3 validation
CI has demonstrated successful execution of:
- `pnpm install --frozen-lockfile`
- migrations `0000` through `0003`
- development seed
- module-boundary lint
- TypeScript typecheck across all workspace packages including `apps/web`
- Sprint 0–2 tests
- public inquiry security/E2E tests
- production builds for the whole monorepo

During Sprint 3 CI, regression tests caught two integration defects before merge:
1. the global Nest auth guard needed explicit `Reflector` injection after adding `@PublicRoute()`,
2. Turborepo needed explicit public-inquiry environment propagation so the new E2E suite could not silently skip.
Both were fixed before PR #4 was merged.

## Sprint 4 — merged customer identity
`Person | Company -> CustomerAccount -> ContactPoint -> Lead / Opportunity` (PR #17, migration `0004`, DD-024).

## Sprint 5 — public configurator v1 (in review)
Validated flow:

`Catalog (CONFIGURABLE) -> /kreator (server-loaded, 5 min revalidation) -> Next route -> Public Configurator API -> PublicConfigurationRequest + Lead -> Audit + DomainEvents + Outbox`

Established:
- catalog-driven customer configurator with a live proportional drawing (top + front view), mobile layout, honest "no automatic price" copy
- `GET /public/configurator/products` (active CONFIGURABLE only, no price fields) and `POST /public/configurator/requests` behind the existing server-to-server credential
- validation shared with the Core (`assessConfiguration`)
- immutable `public_configuration_requests` snapshot + Lead in one transaction; PII excluded from events/audit
- idempotent starter catalog (table, sideboard) applied by `db:bootstrap:prod` on each API release
- migration `0005`, DD-025, `docs/IMPLEMENTATION_SPRINT_5.md`
- fallback to the static v0.4 configurator when the API is unreachable

## Security / isolation decisions enforced
- Business reads require explicit `organizationId`.
- Lead, Opportunity, Product, Configuration, PriceCalculation and Quote lookup boundaries are organization-scoped.
- Development user auth validates active organization membership and cannot run in production.
- Public inquiry does not reuse development user headers.
- Public inquiry organization is server-controlled and cannot be supplied by the browser.
- Website API credential remains server-side.
- Public inquiry PII is stored only in the dedicated intake source record and is not duplicated into event/audit payloads.
- Critical writes share one Unit of Work with audit + event/outbox persistence.

## Deliberate current limitations
1. External production identity provider for internal/customer accounts is not selected/connected yet.
2. Outbox persistence exists; publisher/worker delivery is not implemented yet.
3. Production observability is not implemented beyond health/readiness, correlation IDs and CI diagnostics.
4. Quotes are **internal DRAFTS only**. Tax/VAT policy, discounts, approvals, READY/SENT/VIEWED/ACCEPTED transitions and documents are intentionally not claimed yet.
5. Quote numbering is collision-resistant MVP, not a final fiscal/legal numbering policy.
6. AI may not autonomously price or bind the business to price/date commitments.
7. Customer-facing room-photo analysis and visualization are not implemented yet.
8. Capacity/availability truth is not implemented; the system must not promise production/delivery dates from guesswork.
9. Public website uses intentional material abstractions until the real Avitus realization media library is connected.
10. Public production deployment, DNS, production secrets, privacy copy and edge rate limiting are not completed yet.

## First website readiness
The **first website version is already implemented and merged into `main`**. It can be viewed immediately in a development/Codespaces preview by running `apps/web` on port 3001.

For a public production v0.1 at `Avitus-Materia.com`, the remaining deployment slice is:
1. choose/provision production web + API hosting and PostgreSQL,
2. apply migrations and production environment/secrets,
3. deploy `apps/web` and `apps/api`,
4. connect DNS/TLS for `Avitus-Materia.com`,
5. add edge rate limiting/WAF for public inquiry,
6. finalize privacy/consent and retention wording,
7. smoke-test inquiry -> CRM Lead end to end,
8. replace/add real project photography when the media pack is available.

The advanced AI Configurator is **not a prerequisite for publishing website v0.1**; it is the next customer-product layer.

## Customer-facing strategic pillar
The AI Product Configurator remains a first-class system surface. Product/Configuration/Pricing are now stable enough to build the guided public configuration flow without creating a parallel truth model. AI/visualization will operate through controlled services and versioned Configuration rather than writing arbitrary commercial state.

## Future partner network
Core remains organization-aware to preserve the path to Partner Organizations, capability registry, Work Orders, scoped partner portal and distributed manufacturing orchestration.

## Next engineering sequence
1. Preview and review the first public website on desktop/mobile using real Avitus copy/media feedback.
2. Create the production/staging deployment slice and connect `Avitus-Materia.com`.
3. Add real realization media library and structured project content.
4. Build the first guided public Product Configurator on the existing Product/Configuration/Pricing truth model.
5. In parallel, continue Quote policy: VAT/tax, margin/discount approvals and controlled transitions to READY/SENT.
6. Before customer delivery promises, implement BusinessCalendar + capacity/availability estimate truth.
7. Then extend accepted Quote -> Order / Project.
8. Add room-photo analysis and generated visualization only after the basic configuration/quote/customer journey is stable.

## Multi-agent coordination
Active work, reserved migration/decision/sprint numbers and known collisions live in `docs/WORK_BOARD.md`; the protocol is `docs/COORDINATION.md` (DD-023). Customer identity (formerly PR #5, which collided with `main` on migration `0003`, `DD-022` and sprint numbering) is rebuilt as Sprint 4 on current `main` with migration `0004`, DD-024 and `IMPLEMENTATION_SPRINT_4.md`; it replaces PR #5 once green.

## Project memory rule
GitHub documentation is the durable project memory. Material architectural/product decisions must be reflected in repository docs rather than relying on chat history alone.
