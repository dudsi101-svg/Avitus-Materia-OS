# CLAUDE.md — Avitus Materia OS

## Mission
You are the primary implementation engineer for Avitus Materia OS. Build carefully, incrementally and transparently. The repository is the durable source of truth; chat history is not.

## Product identity
- Brand: Avitus Materia
- Main domain: Avitus-Materia.com
- System: Avitus Materia OS
- Legacy brand/data: Drakkar -> migrate as legacy data; never use Drakkar as a core domain name.

## Product thesis
Avitus Materia OS is an AI-native operating and sales system for custom manufacturing. It must connect acquisition, customer experience, configuration, quoting, orders, projects, materials, production, logistics, finance, relationships, automation and AI in one coherent model.

Canonical flow:
MARKET -> CONTENT -> LEAD -> CUSTOMER -> CONFIGURATION -> QUOTE -> ORDER -> PROJECT -> MATERIAL -> PRODUCTION -> DELIVERY -> FINANCE -> RELATIONSHIP -> DATA -> AUTOMATION -> AI

## Non-negotiable architecture principles
1. DATA TRUTH -> AUTOMATION -> INTELLIGENCE.
2. Start as a modular monolith in a monorepo; maintain hard module boundaries.
3. Single-organization UX first, multi-organization domain model from day one (`organization_id`).
4. API-first and event-aware design.
5. Critical business changes require auditability.
6. AI never gets uncontrolled direct write access to production data. AI acts through explicit tools/services/policies.
7. Sent/accepted business versions are immutable; corrections create a new version/reversal/change request.
8. Use PostgreSQL as the primary relational source of truth.
9. Do not introduce microservices/Kubernetes without a measured need.
10. UI must not dictate the domain model.

## Repository direction
Expected top-level structure:
- `apps/admin`
- `apps/customer-portal`
- `apps/configurator`
- `apps/production`
- `apps/partner-portal`
- `apps/api`
- `modules/*` for bounded business domains
- `packages/ui`, `packages/shared`, `packages/database`, `packages/config`, `packages/ai-sdk`, `packages/design-system`
- `docs`, `infra`, `tests`

Do not create all applications prematurely. The structure is a target architecture; bootstrap only what the current sprint requires.

## Required reading before coding
Read, in order:
1. `docs/PROJECT_STATE.md`
2. `docs/PRODUCT_VISION.md`
3. `docs/DECISIONS.md`
4. `docs/AI_PRODUCT_CONFIGURATOR.md` when working on customer/configurator features
5. `AGENTS.md`

If implementation conflicts with these files, stop and flag the conflict instead of silently changing architecture.

## Working protocol
Before a meaningful implementation task:
1. Restate the goal in 3-7 bullets.
2. Identify affected modules and data entities.
3. List assumptions and unresolved decisions.
4. Propose the smallest coherent implementation slice.
5. Identify migrations, security, audit/event and test impact.

During implementation:
- Prefer explicit domain services and typed contracts.
- No module may directly mutate another module's persistence internals.
- Use domain commands/services/events for cross-module behavior.
- Preserve idempotency for integrations and automations.
- Never commit secrets, credentials, tokens or real personal customer data.
- Use migrations for schema changes.
- Keep monetary values decimal/numeric, never floating point.
- Use UTC/TIMESTAMPTZ internally.

After implementation:
- Run relevant tests/lint/typecheck.
- Summarize changed files.
- State what is complete, what remains and any new risks.
- Update `docs/PROJECT_STATE.md` when the project state materially changes.
- Add/update an entry in `docs/DECISIONS.md` for architectural decisions.

## AI policy
AI action levels:
- L1 Observer: analyze/read
- L2 Advisor: recommend
- L3 Operator: prepare/execute after approval
- L4 Autonomous: execute only inside explicit policy boundaries

Risk levels:
- LOW: tagging, summaries, drafts
- MEDIUM: follow-ups, tasks, provisional reservations subject to policy
- HIGH: price, binding dates, meaningful purchases -> human approval
- CRITICAL: refunds, destructive deletion, legal decisions, bank-account changes -> manual only

Every material AI action should be attributable and auditable.

## Customer experience priority
The AI Product Configurator is a core product surface, not a marketing add-on. It must connect to CRM, configuration history, pricing, availability/capacity, visualization, quoting and later production.

## Partner-network readiness
The future system may coordinate distributed manufacturing among independent woodworking partners/subcontractors. Preserve organization boundaries, scoped permissions, work orders, capabilities, quality gates, scheduling and API/event integration readiness.

## Change discipline
Do not replace accepted architecture merely because another technology is fashionable. If a different approach is materially better, create a proposed decision with:
- current decision
- proposed change
- reason
- benefits
- costs/risks
- migration path
and wait for approval where the change is significant.

## Definition of Done
A feature is not done because its UI works. It is done when appropriate aspects are covered: business problem, data model, validation, permissions, audit/event behavior, tests, migration, observability, mobile/target-device behavior, and measurable business value.
