# Avitus Materia OS — Project State

**Checkpoint:** 1 — Sprint 0 foundation validated
**Date:** 2026-09-26
**Status:** Sprint 0 implementation complete on branch `sprint-0/core-foundation`; PR #1 awaiting final frozen-lockfile CI and merge.

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
- Monorepo + modular monolith
- TypeScript / Node.js
- Next.js admin surface
- NestJS API composition root
- PostgreSQL source of truth
- Drizzle SQL-first typed data access
- Zod boundary validation
- organization scoping from day one
- RBAC foundation
- append-oriented audit history
- domain events + transactional PostgreSQL outbox foundation
- development-only auth adapter that is forbidden in production
- no arbitrary AI database access

## Sprint 0 vertical slice
Validated flow:

`Authenticated development user -> Organization context -> Create/List/Read Lead -> AuditEvent + LeadCreated DomainEvent + OutboxEvent -> Admin UI`

Implemented on `sprint-0/core-foundation`:
- pnpm workspace + Turborepo
- committed `pnpm-lock.yaml` for reproducible installs
- strict TypeScript baseline
- `apps/api` NestJS API
- `apps/admin` Next.js minimal Command Center
- `packages/config`
- `packages/database`
- `packages/shared`
- `modules/iam`
- `modules/crm`
- `modules/audit`
- `modules/events`
- PostgreSQL migration runner
- Sprint 0 database migration
- development seed for Avitus Materia organization/user/permissions
- organization-scoped Lead repository
- `LeadCreated` domain event persistence
- transactionally persisted outbox record
- audit record created in the same Unit of Work
- correlation IDs and structured HTTP error shape
- health/readiness endpoints
- tenant-isolation integration test
- API E2E test covering Lead creation, audit/event/outbox persistence, organization isolation and structured validation errors
- GitHub Actions CI
- local Docker PostgreSQL
- local-development instructions
- basic module-boundary verification script

## Validation completed
CI has demonstrated successful execution of:
- dependency installation
- PostgreSQL migration
- development seed
- module-boundary lint
- TypeScript typecheck
- CRM unit/integration tests
- API E2E tests
- production build

During validation the tests found and drove fixes for:
1. workspace build ordering before typecheck,
2. environment propagation into Turborepo test processes,
3. reliable DomainError classification across package/bundle boundaries,
4. cross-organization Lead lookup behavior returning a safe `404` instead of exposing another organization's data.

## Security / isolation decisions enforced
- Business reads require explicit `organizationId`.
- Lead lookups filter by both organization and entity ID.
- Development auth requires explicit user + organization headers and validates membership.
- `AUTH_MODE=development` cannot start when `NODE_ENV=production`.
- Lead creation checks `crm.lead.write`; reads check `crm.lead.read`.
- Audit/event records retain organization, actor and correlation context.
- Cross-organization Lead list/read isolation is covered by database integration and HTTP E2E tests.

## Deliberate Sprint 0 limitations
1. External production identity provider is intentionally not selected/connected yet. Production startup rejects the development auth mode.
2. Outbox persistence exists; publisher/worker delivery is a later slice. No fake delivery guarantee is claimed.
3. Observability is currently limited to health/readiness, correlation IDs and CI diagnostics; production telemetry comes later.
4. No AI agent or customer configurator execution is included in Sprint 0.

## Customer-facing strategic pillar
The AI Product Configurator remains a first-class system surface. Its domain/UX direction is documented and will follow the Lead/Opportunity/Configuration sales foundation rather than bypassing source-of-truth modeling.

## Future partner network
Core remains organization-aware to preserve the path to Partner Organizations, capability registry, Work Orders, scoped partner portal and distributed manufacturing orchestration.

## Next engineering sequence
1. Complete final CI using the committed lockfile with `pnpm install --frozen-lockfile`.
2. Merge PR #1 only after that CI is green.
3. Start Sprint 1 on a fresh branch with vertical slice `Lead -> Opportunity -> Configuration`.
4. Introduce quote/pricing versioning after the configuration foundation.
5. Build the first customer-facing configurator slice on top of those stable sources of truth.

## Project memory rule
GitHub documentation is the durable project memory. Material architectural/product decisions must be reflected in repository docs rather than relying on chat history alone.
