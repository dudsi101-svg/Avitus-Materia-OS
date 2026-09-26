# Avitus Materia OS — Project State

**Checkpoint:** 1 — Sprint 0 foundation
**Date:** 2026-09-26
**Status:** Implementation started on branch `sprint-0/core-foundation`

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

## Sprint 0 vertical slice implemented
Target flow:

`Authenticated development user -> Organization context -> Create/List Lead -> AuditEvent + LeadCreated DomainEvent + OutboxEvent -> Admin UI`

Implemented on `sprint-0/core-foundation`:
- pnpm workspace + Turborepo
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
- tenant-isolation integration test foundation
- GitHub Actions CI definition
- local Docker PostgreSQL
- local-development instructions
- basic module-boundary verification script

## Security / isolation decisions already enforced
- Business reads require explicit `organizationId`.
- Lead lookups filter by both organization and entity ID.
- Development auth requires explicit user + organization headers and validates membership.
- `AUTH_MODE=development` cannot start when `NODE_ENV=production`.
- Lead creation checks `crm.lead.write`; reads check `crm.lead.read`.
- Audit/event records retain organization, actor and correlation context.

## Known bootstrap limitations
1. `pnpm-lock.yaml` has not yet been generated because the current execution environment has no npm-registry network access. CI temporarily uses `pnpm install --no-frozen-lockfile`. The first environment with registry access must generate/commit the lockfile and switch CI to `--frozen-lockfile`.
2. External production identity provider is intentionally not selected/connected yet. Production startup rejects the development auth mode.
3. Full API E2E coverage is still to be added after dependencies can be installed and the application can be executed in an internet-enabled/Codespaces environment.
4. Outbox persistence exists; publisher/worker delivery is a later slice. No fake delivery guarantee is claimed.

## Customer-facing strategic pillar
The AI Product Configurator remains a first-class system surface, but is intentionally outside Sprint 0 implementation. Its domain/UX direction remains documented and will follow the Lead/Opportunity foundation.

## Future partner network
Core remains organization-aware to preserve the path to Partner Organizations, capability registry, Work Orders, scoped partner portal and distributed manufacturing orchestration.

## Next engineering sequence
1. Run/install Sprint 0 dependencies in Codespaces or another registry-enabled environment.
2. Generate and commit `pnpm-lock.yaml`.
3. Execute migration, seed, typecheck, tests and build; fix all findings before merge.
4. Add API-level E2E test for create/list + organization isolation.
5. Merge Sprint 0 after CI is green.
6. Start Sprint 1 vertical slice: `Lead -> Opportunity -> Configuration`.
7. Then introduce pricing/quote versioning, followed by configurator/customer experience.

## Project memory rule
GitHub documentation is the durable project memory. Material architectural/product decisions must be reflected in repository docs rather than relying on chat history alone.
