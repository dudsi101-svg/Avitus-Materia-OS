# Avitus Materia OS — Implementation Sprint 0

**Goal:** prove the architecture with the smallest production-quality vertical slice before building broad business functionality.

## 1. Sprint objective
Bootstrap a runnable monorepo and deliver:

`Authenticated user -> Organization context -> create/read Lead -> AuditEvent + DomainEvent -> visible in minimal Admin UI`

This is intentionally small. It validates the foundation used by every later module.

## 2. Required reading
Before implementation:
- `CLAUDE.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/DECISIONS.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_MODEL.md`
- `docs/DOMAIN_RULES.md`

## 3. Scope
### Monorepo foundation
- pnpm workspace
- Turborepo
- TypeScript strict mode
- shared formatting/linting conventions
- environment validation

### Apps
Create only:
- `apps/admin`
- `apps/api`

Do not scaffold empty customer/configurator/production/partner apps yet.

### Packages
Create only what the slice needs, expected:
- `packages/config`
- `packages/database`
- `packages/shared` (minimal)

### Modules
Create:
- `modules/iam`
- `modules/crm`
- `modules/audit`
- `modules/events`

Avoid adding other empty modules.

## 4. Backend baseline
- NestJS API composition root
- PostgreSQL
- one selected typed data-access/migration approach consistent with Technical Architecture
- validation schemas
- structured error shape with correlation ID
- health/readiness endpoint

## 5. Identity/organization
Implement a clean auth adapter boundary.

If final identity provider is not selected/available, use a development-safe adapter/stub that cannot accidentally ship as production auth without an explicit configuration change.

Implement:
- Organization
- User
- OrganizationUser membership
- Role/Permission minimum needed for Lead create/read
- request organization context

## 6. CRM vertical slice
Implement minimal Lead fields necessary to prove architecture:
- id
- organization_id
- source/optional title
- status
- priority
- optional assigned user
- created/updated timestamps

Do not attempt the complete v0.2 CRM schema in Sprint 0.

API capabilities:
- create Lead
- get/list Leads scoped to organization

## 7. Audit/events
Creating a Lead must produce:
- `LeadCreated` DomainEvent
- AuditEvent identifying actor/entity/action/time

Prefer a transactionally consistent pattern. If full async outbox is too large for the first commit, implement the persistence foundation and document the exact next step; do not fake reliability.

## 8. Admin UI
Minimal authenticated/admin shell demonstrating:
- current organization context
- list Leads
- create Lead form
- validation/error feedback

This is a proof of architecture, not final visual design.

## 9. Organization isolation test
Mandatory test:
- user/org A cannot read or mutate Lead belonging to org B through API/repository methods.

Tenant isolation is a release blocker.

## 10. Testing
Minimum:
- domain/application unit test where meaningful
- repository/database integration test
- API test for create/list + auth/org isolation
- at least one UI/E2E happy path if environment allows without disproportionate setup

## 11. CI
GitHub Actions should run:
- install locked dependencies
- lint
- typecheck
- tests
- build

Do not require production cloud secrets for ordinary PR validation.

## 12. Local development
Provide documented commands for:
- install
- start Postgres/dependencies
- migrate
- run dev
- run tests

A new developer/agent should not need tribal knowledge.

## 13. Security/quality rules
- no secrets committed
- no real customer data
- no arbitrary AI/LLM integration in Sprint 0
- no cross-module persistence writes
- no bypass of organization context
- no floating point for future money primitives
- schema changes through migrations only

## 14. Out of scope
Do NOT implement yet:
- Product Configurator UI
- pricing engine
- quote engine
- inventory
- production workflows
- partner portal
- AI agents
- vector DB
- Redis unless truly required
- Kubernetes
- microservices

## 15. Deliverables
- runnable code
- migrations
- tests
- CI
- local setup instructions
- concise architecture notes for anything that diverged from v0.4
- update `docs/PROJECT_STATE.md`
- update `docs/DECISIONS.md` if a new architectural decision was made

## 16. Acceptance criteria
Sprint 0 is accepted when:
1. clean clone/setup can run locally following docs
2. database migration creates the foundation
3. admin can create and list Leads
4. Lead is always organization-scoped
5. another organization cannot access it
6. `LeadCreated` and AuditEvent are persisted as designed
7. validation/error handling works
8. CI passes
9. no secrets/real PII are in repository
10. implementation remains a modular monolith with clear boundaries

## 17. Handoff report
Claude should finish with:
- summary
- files changed
- commands/tests run and results
- architecture decisions made
- assumptions
- known limitations
- next recommended vertical slice
