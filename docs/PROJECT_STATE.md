# Avitus Materia OS — Project State

**Checkpoint:** 9 — Sprints 0–8 merged; Sprint 8 deployed; Sprint 9 claimed  
**Date:** 2026-09-28  
**Status:** current production API includes Sprint 8 Quote governance. `main` merge commit: `1684408`. Main CI #113 passed and Fly production deploy run 55 completed successfully with API deployment + `/ready` verification.

## Identity
- Brand: **Avitus Materia**
- Main domain: **avitus-materia.com**
- Repository: `dudsi101-svg/Avitus-Materia-OS`
- Previous brand: Drakkar — legacy/history only; never use it for new Core names.

## Product definition
Avitus Materia OS is the central AI-native Operating & Sales System for custom manufacturing.

Canonical value flow:

`MARKET -> CONTENT -> LEAD -> CUSTOMER -> CONFIGURATION -> QUOTE -> ORDER -> PROJECT -> MATERIAL -> PRODUCTION -> DELIVERY -> FINANCE -> RELATIONSHIP -> DATA -> AUTOMATION -> AI`

Core principle: **DATA TRUTH -> AUTOMATION -> INTELLIGENCE**

## Architecture baseline
- monorepo + modular monolith;
- TypeScript / Node.js;
- Next.js public web + internal admin Command Center;
- NestJS API composition root;
- PostgreSQL + Drizzle SQL-first data access;
- Zod boundary validation;
- organization scoping / tenant isolation;
- RBAC foundation;
- transactional Unit of Work for critical multi-write flows;
- append-oriented AuditEvent + DomainEvent + PostgreSQL outbox;
- immutable/versioned significant commercial truth;
- exact fixed-scale money arithmetic;
- explicit public route credentials separate from internal user context;
- no unrestricted AI database writes.

## Delivered vertical slices

### Sprint 0 — foundation
`Organization -> Lead -> Audit + DomainEvent + Outbox -> Admin`

Workspace/tooling, IAM/RBAC foundation, PostgreSQL/migrations, Lead, health/readiness, tenant isolation and CI.

### Sprint 1 — sales/configuration foundation
`Lead -> Opportunity -> Product -> Configuration -> ConfigurationVersion`

Opportunity, catalog, typed options, configuration validation and immutable configuration history.

### Sprint 2 — pricing + draft quotes
`ConfigurationVersion -> PriceCalculation -> CostComponents -> Quote -> QuoteVersion -> QuoteItem`

Exact 4-decimal arithmetic, pricing snapshots, quote versioning and stale-pricing guards.

### Sprint 3 — public website + inquiry intake
`Public web -> server proxy -> Public Inquiry -> PublicInquirySubmission + Lead`

Secure server-side public intake, honeypot and PII-minimized append-only events/audit.

### Website v0.4
Multi-page Avitus Materia brand site with real realization photography, heritage/material direction and pages for home, O nas, Realizacje, Kolekcje, Kreator, Dla firm and Kontakt.

### Sprint 4 — customer identity
`Person | Company -> CustomerAccount -> ContactPoint -> Lead / Opportunity`

PR #17, migration `0004`, DD-024. Normalized contact truth and explicit governed customer links.

### Sprint 5 / 5b — public configurator
`Catalog -> /kreator -> PublicConfigurationRequest + Lead`

PR #18, migrations `0005`–`0006`, DD-025/DD-026. Catalog-driven generic option rendering, shareable configurations and immutable intake snapshots without public pricing internals.

### Sprint 6 — conversion into sales work
`PublicConfigurationRequest -> Opportunity + Configuration v1`

PR #21, migration `0007`, DD-027. Explicit, atomic, one-time conversion with exact customer option values revalidated against current catalog.

### Sprint 7 — customer identity handoff
`converted request -> identify/create CustomerAccount -> link Lead + Opportunity -> pricing`

PR #26. Operator-controlled identity resolution, exact email/phone suggestions, no silent merge, atomic consistent links and Command Center identity UX. Fly production deploy run 48 succeeded.

### Sprint 8 — Quote governance
`CustomerAccount -> Opportunity -> Configuration -> PriceCalculation -> Quote DRAFT -> READY -> SENT`

PR #27, migration `0008`, DD-028. Delivered:
- immutable buyer snapshot per governed QuoteVersion;
- explicit `tax_rate_bps` rather than hidden VAT assumptions;
- explicit discount + reason;
- human approval for non-zero discount in the first governance policy;
- exact post-discount net/tax/total arithmetic;
- actual post-discount margin calculation;
- deterministic READY gate requiring current configuration/pricing, linked CustomerAccount, matching buyer snapshot, tax policy, validity and discount approval;
- SENT only from READY;
- customer-ready/sent versions cannot be rewritten in place;
- events/audit carry identifiers/commercial summaries rather than buyer email/phone;
- Command Center controls for commercial terms, approval, READY and SENT.

Main CI #113 passed after merge. Fly production run 55 deployed the API/database changes and verified `/ready`; web correctly skipped because this was not a public-web release.

## Production / deployment state
- Fly.io: public web, API and managed PostgreSQL.
- home.pl: registrar/DNS/mail.
- path-aware GitHub Actions production deployment compares against last verified app deployment.
- current API production includes migrations through `0008`.
- API uses IPv6-compatible bind for Fly private networking.
- public site/domain are live.
- internal `apps/admin` Command Center exists in repo but is **not yet claimed as a separately production-deployed/authenticated operator surface**.

## Security / commercial invariants currently enforced
- organization-scoped repositories/services;
- public organization controlled server-side;
- public credentials stay server-side;
- critical write flows use UoW + audit/event/outbox;
- PII minimized in append-only payloads;
- CustomerAccount is current customer truth;
- QuoteVersion is historic buyer/commercial truth;
- pricing calculation is separate from selling QuoteVersion;
- non-zero discounts require explicit reason and human approval before READY;
- stale configuration/pricing blocks READY;
- SENT cannot be reached directly from DRAFT;
- later corrections create new history, not destructive overwrites.

## Deliberate current limitations
1. Production identity provider for internal/customer accounts is not finalized; admin production access is not yet a finished surface.
2. Outbox publisher/worker delivery is not implemented.
3. Production observability remains basic.
4. PDF/document rendering, email delivery, e-signature and payment schedules are not part of Quote governance yet.
5. Quote numbering is collision-resistant MVP, not final fiscal/legal numbering policy.
6. Quote acceptance semantics and accepted Quote -> Order/Project conversion are not implemented yet.
7. Capacity/calendar/availability truth is not implemented; no customer-visible promised dates should be generated from guesswork.
8. Material/inventory/production execution is not yet implemented.
9. GDPR/privacy lifecycle and marketing consent are incomplete.
10. AI may not autonomously set binding price or delivery commitment.

## Current gap after Sprint 8
The system can now produce a governed customer-ready/sent commercial Quote while preserving buyer and pricing history. The next missing bridge is the transition from a customer commercial commitment to operational work.

Target next flow:

`Governed Quote -> ACCEPTED -> Order -> Project`

Per DD-018, `Order` is the commercial commitment and `Project` is operational execution; they must remain separate.

## Sprint 9 — claimed
Rules:
- only an explicitly accepted governed Quote can become an Order;
- accepted QuoteVersion is the immutable commercial source for the Order;
- conversion is one-time and concurrency-safe;
- Order snapshots accepted buyer/totals/currency/version references;
- Project is created separately and linked to Order/configuration;
- no promised completion date until scheduling/capacity truth exists;
- acceptance + conversion are organization-scoped, audited and evented.

See `docs/IMPLEMENTATION_SPRINT_9.md` once landed.

## Next engineering sequence
1. Sprint 9: Quote acceptance + Order + Project.
2. Production-authenticated admin/operator surface and full browser journey smoke.
3. BusinessCalendar + capacity/availability.
4. Material requirements/reservations + inventory truth.
5. Production workflow/jobs/operations + QA + delivery/install.
6. Outbox publisher/integration delivery + stronger observability.
7. Customer portal, communications/history and payments.
8. AI-assisted configuration/visualization/autonomy only over controlled domain tools.
9. Partner-network capabilities after the single-company loop is reliable.

## Multi-agent coordination
Active lanes/reservations live in `docs/WORK_BOARD.md`; protocol is `docs/COORDINATION.md` (DD-023). PRs are the tie-breaker if the board is stale.

## Project memory rule
GitHub documentation is durable project memory. Material decisions and validated state must be written back to the repository; chat is not authoritative.
