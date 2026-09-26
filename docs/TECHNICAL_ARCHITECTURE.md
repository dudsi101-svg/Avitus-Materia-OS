# Avitus Materia OS — Technical Architecture v0.4

**Status:** Proposed baseline for Sprint 0
**Goal:** a simple, strongly bounded, AI-friendly architecture that can grow into multi-organization and distributed-manufacturing use cases without premature microservices.

## 1. Architecture style
### Monorepo + modular monolith
One repository, one primary backend deployment initially, multiple UI/application surfaces where needed.

Reasons:
- fastest iteration for a small AI-assisted engineering team
- one transaction boundary for core sales/operations flows
- simpler local development and deployment
- easier schema evolution
- strong type sharing where appropriate
- preserves future extraction if module boundaries stay clean

Microservices are a future scaling/team-boundary decision, not a starting assumption.

## 2. Recommended stack
### Runtime/language
**TypeScript on current Node.js LTS** for the primary application stack.

Rationale:
- one primary language across frontend/backend/tooling
- strong ecosystem for web, API, automation and AI integrations
- excellent fit for Claude/GPT code generation and review
- easier contract/type sharing than a mixed-language MVP

Performance-critical services may later be extracted to Go/Rust only when profiling/business need justifies it.

### Monorepo tooling
- `pnpm` workspaces
- `Turborepo` for task orchestration/cache

Alternative: Nx if stronger dependency-boundary tooling becomes valuable. Do not combine both initially.

### Frontend
**Next.js + React + TypeScript** for customer-facing/admin web surfaces.

Use:
- responsive/mobile-first UI
- server rendering where acquisition/SEO matters
- PWA capabilities where useful
- shared design system rather than copied components

Do not force every app into a separate deployment at Sprint 0. The target repository structure may be consolidated operationally until independent deployment is valuable.

### Backend
**NestJS on Node.js** as the initial modular-monolith API/application framework.

Why:
- explicit module boundaries
- dependency injection
- guards/interceptors/pipes
- good fit for domain/application layering
- OpenAPI support
- straightforward workers/background processing integration

Keep business rules framework-light inside domain/application modules so a future extraction does not require rewriting all logic.

### Database
**PostgreSQL**.

Recommended data access direction:
- Drizzle ORM / SQL-first typed access for migrations and explicit PostgreSQL control
- repositories owned by modules
- no business logic in generic active-record models

If the implementation team strongly prefers Prisma, record the decision before switching; do not use multiple primary ORMs.

### Validation/contracts
Use a single schema-validation approach based on **Zod** (or an equivalent agreed typed schema library) at external/application boundaries.

Generate/publish OpenAPI for external HTTP contracts.

## 3. Domain/module layering
Each business module should conceptually contain:

```text
module/
  domain/
    entities/
    value-objects/
    policies/
    events/
  application/
    commands/
    queries/
    services/
    ports/
  infrastructure/
    persistence/
    integrations/
  api/
    controllers/
    schemas/
```

Exact folders may be simplified early, but dependencies must flow inward:

`API/Infrastructure -> Application -> Domain`

Business/domain logic should not depend on Next.js, NestJS controllers or a specific AI provider.

## 4. Cross-module rules
A module owns its write model/persistence boundary.

Forbidden pattern:
- Production directly updates Sales/Order tables through another module's repository internals.

Preferred patterns:
- explicit application service contract
- command/use case
- domain event / integration event
- read-only projection/query contract

Direct SQL joins across modules may be acceptable for controlled analytical/read models, but not as a hidden write dependency.

## 5. Multi-organization boundary
Design core business tables with `organization_id` where relevant.

Sprint 0 goals:
- explicit Organization context in authenticated requests
- authorization always scoped by organization
- repository/query helpers that make missing tenant scope difficult
- tests proving cross-organization isolation for critical paths

Do not market as full multi-tenant SaaS yet; make the data/security model ready.

## 6. Authentication and authorization
Use a proven external identity provider rather than building credential infrastructure.

Provider must support:
- MFA
- secure session/token standards
- account recovery
- organization/member mapping or a clean integration path
- web/mobile compatibility

Keep provider-specific IDs behind an identity adapter.

Authorization inside OS:
- RBAC foundation
- organization scoping
- later policy/attribute checks for sensitive operations

Never treat UI hiding as authorization.

## 7. API strategy
### Internal/external API
REST/OpenAPI first for transactional business operations.

Reasons:
- predictable integration surface
- simple partner/webhook tooling
- excellent observability and testability

GraphQL may be added later if a demonstrated client/query problem justifies it; it is not needed for Sprint 0.

### API rules
- stable resource/command semantics
- explicit domain error codes
- correlation ID on requests
- idempotency keys on externally retried mutation endpoints
- optimistic concurrency/version checks on sensitive versioned entities where appropriate

## 8. Events and outbox
The system is event-aware from day one, but does not need a distributed event broker on day one.

Implement:
- meaningful DomainEvent objects
- transactionally persisted outbox for async side effects once needed
- background publisher/worker
- event schema version
- correlation/causation IDs

Initial transport can be PostgreSQL-backed.

Do not deploy Kafka merely to claim event-driven architecture.

## 9. Background jobs / queues
Start with a PostgreSQL-backed job mechanism (for example a proven Postgres job library) if the first workloads permit it.

Suitable early jobs:
- email/message dispatch
- quote PDF generation
- scheduled follow-ups
- integration sync
- AI requests that need asynchronous execution
- outbox publishing

Introduce Redis/BullMQ or a cloud queue only when throughput/latency/workload isolation requires it.

## 10. Cache
No distributed cache is mandatory for Sprint 0.

Add Redis only for measured needs such as:
- high-volume caching
- rate limiting
- distributed coordination
- queue workloads that require it

Correctness must never depend on stale cache state.

## 11. Files/media/object storage
Use **S3-compatible object storage** behind a storage adapter.

Store in PostgreSQL only metadata:
- key/path
- MIME type
- size
- checksum
- dimensions
- classification/owner/entity reference
- timestamps

Use presigned/controlled uploads where appropriate.

Scene photos and customer media require explicit access control and retention policy.

## 12. Search and semantic knowledge
Phase 1:
- PostgreSQL indexes/full-text/trigram where sufficient

Later:
- vector/semantic index only for use cases such as project similarity, documentation and knowledge retrieval

Do not put canonical business truth into a vector database.

## 13. AI Gateway
Create a provider-agnostic `AI Gateway` / `packages/ai-sdk` boundary.

Responsibilities:
- provider adapters
- model selection policy
- structured output validation
- retries/timeouts
- token/cost accounting
- safety/policy checks
- tracing
- prompt/agent version metadata

Business modules should request capabilities, not import a specific provider SDK everywhere.

Example capability contracts:
- summarize conversation
- classify lead
- suggest configuration
- analyze room scene
- generate visualization request payload
- retrieve similar historic projects
- propose follow-up

## 14. AI Context Builder
Never send unrestricted database dumps to models.

Provide scoped builders/services:
- customer context
- opportunity context
- quote context
- project context
- production context
- configurator session context

Each builder should:
- enforce authorization/organization scope
- select minimum necessary fields
- classify/redact sensitive data where appropriate
- record context/version hashes for important actions

## 15. AI action tools
Write actions are exposed as explicit tools/application commands, e.g.:
- create quote draft
- create task
- propose discount
- reserve material (policy bound)
- request visualization
- schedule follow-up

Tool execution flow:
`AI intent -> validated tool input -> authorization -> business policy -> optional approval -> domain service -> audit/event -> result`

No arbitrary SQL tool in production.

## 16. Configurator architecture
The configurator is a first-class app/domain surface.

Flow:
`ConfigurationSession -> ConfigurationVersion -> PriceCalculation/Estimate -> LeadTimeEstimate -> Visualization -> Quote request`

Guest state must be safely convertible into an identified customer/session without losing attribution/history.

Image/scene processing should be asynchronous when expensive.

## 17. Scheduling/capacity
Create a scheduling abstraction before advanced optimization.

First versions may calculate lead time from:
- configured product/workflow
- queued workload
- material availability
- coarse workstation capacity

Keep separate `forecast_delivery_date` and `promised_delivery_date`.

Future optimizer/AI can replace estimation internals without changing external domain semantics.

## 18. Partner-network architecture
Future Partner Organization uses the same Organization identity concept with scoped relationships/permissions.

Introduce later concepts such as:
- PartnerProfile
- Capability
- PartnerWorkstation/Machine capability
- CapacityWindow
- WorkOrder
- WorkOrderOperation
- ExternalQualityCheck
- PartnerSettlement

Partner portal receives only the required slice of customer/project information.

Future partners may integrate through API/webhooks rather than the UI.

## 19. Observability
Baseline from Sprint 0:
- structured logs
- correlation IDs
- centralized error reporting (e.g. Sentry-class service)
- basic request/database latency metrics
- health/readiness endpoints
- job failure visibility

Add OpenTelemetry instrumentation early enough that provider/tooling can change without invasive rewrites.

Business observability is separate and includes:
- quote conversion
- margin drift
- production delay
- material shortage
- automation failures
- AI cost per action/order

## 20. Security baseline
- MFA through identity provider
- least privilege
- tenant/organization isolation tests
- encryption in transit
- encrypted provider secrets/secrets manager
- no secrets in repository
- dependency/security scanning in CI
- secure file upload validation
- audit sensitive actions
- rate limits for public/auth endpoints where appropriate
- CSRF/XSS/session hardening according to chosen auth/web architecture

## 21. Privacy/GDPR readiness
Data classes:
- PUBLIC
- INTERNAL
- CONFIDENTIAL
- RESTRICTED

PII and room imagery require controlled access and retention.

Design for:
- export/access workflows
- deletion/anonymization where legally allowed
- legal retention exceptions
- processing/provider inventory

Do not reuse customer room photos for training/marketing without a separate legal basis/authorization.

## 22. Testing strategy
### Unit tests
Domain rules, policies, value objects, pricing formulas.

### Integration tests
PostgreSQL repositories, migrations, module contracts, outbox behavior.

Use ephemeral/test database containers where practical.

### API tests
Authorization, organization isolation, validation, idempotency and state transitions.

### E2E / UI
Playwright for critical paths:
- lead/configuration/quote flow
- customer portal acceptance
- configurator session persistence

### Contract tests
For important external adapters/webhooks and AI structured outputs.

## 23. CI/CD
GitHub Actions baseline:
- install with locked dependencies
- lint
- typecheck
- unit/integration tests
- build
- migration validation
- security/dependency checks as configured

Deployment environments:
- local
- preview/PR where practical
- staging
- production

Production changes should be traceable to commit/deployment.

## 24. Deployment portability
Package backend/services as containers where useful and keep provider-specific infrastructure behind configuration/adapters.

Initial hosting may use managed platforms; avoid coupling domain code to one cloud vendor.

Use managed PostgreSQL with backups/PITR appropriate to production criticality.

## 25. Database migration policy
- migrations committed to repository
- no manual production schema editing
- backward-compatible rollout when zero/low downtime matters
- migration plan for destructive changes
- test migrations on staging/ephemeral DB

## 26. Backup/recovery
Production minimum:
- automated database backups
- PITR where feasible
- encrypted object storage/versioning as appropriate
- documented restore process
- periodic restore tests

A backup not tested for restoration is not considered sufficient.

## 27. Repository dependency rules
`apps/*` may depend on `modules/*` and `packages/*` through public contracts.

Modules should not import another module's infrastructure/persistence internals.

`packages/shared` must remain small and technical; domain logic belongs to its domain module.

Introduce automated dependency-boundary checks when scaffolding the monorepo.

## 28. Sprint 0 recommended physical bootstrap
Create only:

```text
apps/
  admin/           # minimal authenticated shell
  api/             # NestJS composition root
packages/
  config/
  database/
  shared/
modules/
  iam/
  audit/
  events/
docs/
infra/
tests/
```

Do not scaffold empty configurator/production/partner apps until their first slice starts.

## 29. Sprint 0 first vertical slice
Suggested proof-of-architecture:

`Authenticated user -> Organization context -> create/read a Lead -> AuditEvent + DomainEvent -> view in minimal Admin UI`

This validates:
- auth boundary
- tenant/organization scoping
- API contract
- database/migration
- module boundary
- audit/events
- frontend/backend integration
- CI/test/deployment path

Then extend into `Lead -> Opportunity -> Configuration -> Quote`.

## 30. Deferred technology decisions
Do not finalize without need/evidence:
- Redis
- distributed broker (Kafka/NATS/etc.)
- Kubernetes
- GraphQL
- dedicated vector DB
- separate microservices
- Go/Rust services
- complex workflow engine

## 31. Architecture fitness tests
As the codebase grows, automatically test/enforce:
- no invalid cross-module imports
- organization scope on sensitive repositories/queries
- no secrets in commits
- migration reproducibility
- API contract stability where needed
- quote/version immutability rules
- audit creation on protected actions

## 32. Principle
Build for expansion by **preserving clean boundaries and durable data**, not by deploying enterprise complexity before the business needs it.
