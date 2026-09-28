# Avitus Materia OS — Project State

**Checkpoint:** 7 — Sprint 6 merged and deployed; Sprint 7 identity handoff planned  
**Date:** 2026-09-28  
**Status:** Sprints 0–6 are merged to `main`. Current main is `f1bbe07` (#22). The post-fix Fly production workflow run 41 completed successfully; API deploy and `/ready` verification passed.

## Identity
- Brand: **Avitus Materia**
- Main domain: **avitus-materia.com**
- Repository: `dudsi101-svg/Avitus-Materia-OS`
- Previous brand: Drakkar — legacy/history only; never use it for new Core names.

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
- explicit public-route boundary with separate server-to-server web credential
- no arbitrary AI database access
- important commercial facts are version/snapshot oriented rather than destructively overwritten
- monetary values use exact decimal/fixed-scale arithmetic, not binary floating point

## Delivered vertical slices

### Sprint 0 — foundation
`Authenticated context -> Organization -> Lead -> AuditEvent + DomainEvent + Outbox -> Admin`

Established workspace/tooling, PostgreSQL, migrations, IAM/RBAC foundation, Lead, audit/events/outbox, health/readiness, tenant isolation and CI.

### Sprint 1 — sales/configuration foundation
`Lead -> Opportunity -> Product -> Configuration -> ConfigurationVersion`

Established organization-scoped Opportunity, catalog, typed option validation and immutable ConfigurationVersion history.

### Sprint 2 — pricing and draft quotes
`ConfigurationVersion -> PriceCalculation -> CostComponents -> Quote -> QuoteVersion -> QuoteItem`

Established exact 4-decimal arithmetic, immutable pricing snapshots, immutable QuoteVersion history, stale-pricing guards and organization-scoped pricing/quote APIs. Quotes remain internal drafts.

### Sprint 3 — public website + inquiry intake
`Public Website -> server proxy -> Public Inquiry API -> PublicInquirySubmission + Lead -> Audit + Events + Outbox`

Established secure public inquiry intake with server-side credential, honeypot validation and PII minimization in audit/event payloads.

### Website v0.4 / production brand surface
Public web has moved beyond the original one-page v0.1 baseline. Current site includes multi-page Avitus Materia structure, real realization photography, heritage/material-led brand direction and configurator entry points. Pages include home, O nas, Realizacje, Kolekcje, Kreator, Dla firm and Kontakt.

### Sprint 4 — customer identity
`Person | Company -> CustomerAccount -> ContactPoint -> Lead / Opportunity`

PR #17, migration `0004`, DD-024. Established explicit customer subjects, normalized contacts and governed Lead/Opportunity links.

### Sprint 5 / 5b — public configurator
`Catalog -> /kreator -> Public Configurator API -> PublicConfigurationRequest + Lead`

PR #18, migrations `0005`–`0006`, DD-025/DD-026. The configurator is catalog-driven, renders options generically, uses the Core validation model, supports shareable configuration links, and stores an immutable request snapshot without exposing price or organization internals.

Current starter catalog includes table and sideboard configurations. Sideboard defaults were corrected in PR #19 to depth 30–60 cm and height 50–110 cm.

### Sprint 6 — request conversion into sales work
`PublicConfigurationRequest -> explicit convert -> Opportunity + Configuration v1 -> Pricing -> Draft Quote`

PR #21, migration `0007`, DD-027. Conversion is explicit, atomic and one-time. The Command Center lists configurator requests and can convert one into Opportunity + Configuration using the customer's exact option values, revalidated against the current catalog. The resulting configuration can hand off directly to pricing.

PR #22 fixed a parallel-test race in the rejection E2E test. No production code changed in that fix.

## Production / deployment state
- Fly.io hosts web, API and managed PostgreSQL.
- home.pl remains registrar/DNS/mail provider.
- path-aware GitHub Actions production deployment is enabled.
- deployment target detection compares against the last verified deployed commit per app, preventing skipped/failed deploys from losing pending changes.
- current main deploy workflow run 41 succeeded; web was correctly skipped because the latest change was API/test-side, while API deployed and `/ready` verification passed.
- API private networking uses IPv6-compatible bind (`::`) to support Fly `.internal` traffic.

## Security / isolation decisions enforced
- business reads require explicit `organizationId`;
- core repositories and service boundaries are organization-scoped;
- public routes do not reuse development user headers;
- public intake organization is server-controlled;
- public web credentials remain server-side;
- public intake PII is excluded from event/audit payloads where not needed;
- critical writes share a Unit of Work with audit + domain event/outbox persistence;
- sent/accepted future commercial versions must be immutable; correction means new version/change, not overwrite.

## Deliberate current limitations
1. External production identity provider for internal/customer accounts is still not selected/connected.
2. Outbox persistence exists; publisher/worker delivery is not implemented yet.
3. Production observability remains limited to health/readiness, correlation IDs, CI/deploy diagnostics and incident notes.
4. Quotes are internal **DRAFTS only**. VAT/tax, discounts, approvals, buyer snapshot and READY/SENT/VIEWED/ACCEPTED governance are not implemented.
5. Quote numbering is collision-resistant MVP, not final fiscal/legal numbering policy.
6. AI may not autonomously set binding prices or delivery dates.
7. Customer-facing room-photo analysis and generated visualization are not implemented.
8. Capacity/availability truth is not implemented; the system must not promise production/delivery dates from guesswork.
9. Public intake still needs a final edge rate-limiting/WAF decision and a mature production observability baseline.
10. GDPR/privacy lifecycle (retention, anonymization/deletion, consent model) is not yet a complete domain capability.

## Current gap after Sprint 6
A converted configurator request has:
- original immutable customer contact/intake data,
- a Lead,
- an Opportunity,
- a Configuration v1,
- a path to Pricing and Draft Quote,

but it does **not yet establish the CustomerAccount identity** that should unify the Lead and Opportunity. Sprint 4 already provides the customer model and link invariants; the next slice should connect them explicitly rather than create another contact truth.

## Sprint 7 — planned
Target flow:

`converted request -> identify/create CustomerAccount -> link same account to Lead + Opportunity -> pricing`

Rules:
- operator-controlled identity resolution;
- exact normalized email/phone may suggest an existing account, never silently merge;
- preserve immutable intake;
- no silent reassignment of a Lead/Opportunity already linked to another customer;
- reuse existing CustomerAccount/ContactPoint/LinkCustomerService invariants;
- prefer no migration unless implementation proves a missing persistence invariant.

See `docs/IMPLEMENTATION_SPRINT_7.md`.

## Next engineering sequence
1. Implement Sprint 7 customer identity handoff and production-smoke the full request -> conversion -> customer -> pricing path.
2. Quote governance: buyer snapshot, VAT/tax, discounts/margin approval and controlled `DRAFT -> READY -> SENT` transitions.
3. BusinessCalendar + capacity/availability truth before customer-facing date promises.
4. Accepted Quote -> Order / Project.
5. Outbox worker/integration delivery + production observability.
6. Customer portal/auth and communication history.
7. AI-assisted configuration/visualization only on top of controlled tools, versioned truth and explicit policy boundaries.
8. Partner-network/work-order capabilities after the single-organization operational loop is reliable.

## Multi-agent coordination
Active work, reserved migration/decision/sprint numbers and collisions live in `docs/WORK_BOARD.md`; protocol is `docs/COORDINATION.md` (DD-023). PRs are the tie-breaker when the board is stale.

## Project memory rule
GitHub documentation is durable project memory. Material product/architecture decisions and validated state must be written back to the repository; chat history is not authoritative.
