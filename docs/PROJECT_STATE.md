# Avitus Materia OS — Project State

**Checkpoint:** 2 — Sprint 1 sales foundation validated
**Date:** 2026-09-26
**Status:** Sprint 0 is merged to `main`. Sprint 1 is implemented on `sprint-1/sales-foundation`; PR #2 is awaiting final CI after documentation checkpoint and merge.

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
- Next.js admin surface
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
- configuration history is version/snapshot oriented rather than destructive overwrite

## Sprint 0 — merged foundation
Validated flow:

`Authenticated development user -> Organization context -> Lead -> AuditEvent + LeadCreated DomainEvent + OutboxEvent -> Admin UI`

Sprint 0 established:
- pnpm workspace + Turborepo
- reproducible `pnpm-lock.yaml`
- strict TypeScript baseline
- NestJS API and Next.js admin
- PostgreSQL migration runner and seed
- organization/user/membership/RBAC foundation
- organization-scoped Lead repository/services/API
- domain events, audit and transactional outbox persistence
- correlation IDs and structured HTTP errors
- health/readiness endpoints
- tenant-isolation integration + API E2E coverage
- GitHub Actions CI with frozen lockfile
- module-boundary verification

## Sprint 1 — sales/configuration source of truth
Validated vertical slice:

`Lead -> Opportunity -> Product -> Configuration -> ConfigurationVersion`

Implemented on `sprint-1/sales-foundation`:
- organization-scoped Opportunity domain and API
- ProductFamily / Product / ProductOptionDefinition catalog foundation
- organization-scoped catalog reads
- versioned Configuration domain
- immutable configuration snapshots
- product-option validation for NUMBER / TEXT / ENUM / BOOLEAN
- min/max/enum/unknown-option validation
- readiness evaluation: `INCOMPLETE` vs `READY_FOR_PRICING`
- OpportunityCreated and Configuration events
- audit + domain event + outbox persistence inside the business Unit of Work
- Sprint 1 SQL migration
- development product/options seed for configurable custom table
- RBAC permissions for Opportunity, Catalog and Configuration
- API E2E path covering Lead -> Opportunity -> Configuration
- cross-organization isolation for Lead/Opportunity/Product/Configuration
- invalid configuration/range test coverage
- admin Command Center surface for creating Opportunity and Product Configuration
- refreshed lockfile and successful frozen-lockfile CI

## Validation completed
CI has demonstrated successful execution of:
- `pnpm install --frozen-lockfile`
- PostgreSQL migrations `0000` and `0001`
- development seed
- module-boundary lint
- TypeScript typecheck
- CRM integration tests
- Sprint 0 Lead API E2E tests
- Sprint 1 sales/configuration API E2E tests
- production build including the updated admin surface

The Sprint 1 E2E test verifies that:
1. an Opportunity can only be created from a Lead visible to the active organization,
2. Opportunity creation emits audit + domain event + outbox intent,
3. catalog Product/Option definitions are organization-scoped,
4. Configuration v1 can be incomplete without corrupting truth,
5. Configuration v2 retains v1 and can become `READY_FOR_PRICING`,
6. invalid dimensions are rejected by stable domain error code,
7. another organization receives safe `404` boundaries rather than cross-tenant data.

## Security / isolation decisions enforced
- Business reads require explicit `organizationId`.
- Lead, Opportunity, Product and Configuration lookups filter by organization + entity identity.
- Development auth requires explicit user + organization headers and validates membership.
- `AUTH_MODE=development` cannot start when `NODE_ENV=production`.
- RBAC permissions gate reads/writes per domain.
- Audit/event records retain organization, actor and correlation context.
- Cross-organization isolation is covered at database/service and HTTP E2E levels.

## Deliberate current limitations
1. External production identity provider is not selected/connected yet; production rejects development auth mode.
2. Outbox persistence exists; publisher/worker delivery is a later slice. No fake delivery guarantee is claimed.
3. Observability is limited to health/readiness, correlation IDs and CI diagnostics; production telemetry comes later.
4. Pricing/Quote source of truth is not implemented yet.
5. AI may not execute business actions yet; the AI Product Configurator remains a strategic surface built on top of these sources of truth.
6. Customer-facing visualization/photo placement and room-scene analysis are not implemented yet.

## Customer-facing strategic pillar
The AI Product Configurator is a first-class system surface, not a marketing toy. The current Configuration model is its source-of-truth foundation. Customer UX, AI assistance, room-photo analysis, visualization, availability and pricing must call controlled domain services rather than maintain a separate configuration truth.

## Future partner network
Core remains organization-aware to preserve the path to Partner Organizations, capability registry, Work Orders, scoped partner portal and distributed manufacturing orchestration.

## Next engineering sequence
1. Merge PR #2 after the final documentation-triggered CI is green.
2. Start Sprint 2: Pricing + Quote source of truth.
3. Introduce `PriceCalculation`, `CostComponent`, `Quote`, immutable `QuoteVersion` and `QuoteItem` with margin/approval guards.
4. Connect Configuration -> PriceCalculation -> Quote without duplicating configuration truth.
5. Then build the first customer-facing configurator slice on top of Product/Configuration/Pricing services.
6. Add availability/capacity estimates before making customer delivery-date promises.

## Project memory rule
GitHub documentation is the durable project memory. Material architectural/product decisions must be reflected in repository docs rather than relying on chat history alone.
