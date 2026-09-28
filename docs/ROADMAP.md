# Avitus Materia OS — Roadmap

## Execution order after reconciliation (2026-09-28)

The owner master program supersedes the former implementation order below. F-sections remain scope references, not completion claims. Current baseline: Sprints 0–9 merged; API minimal Order/Project deployed; no production operator login or closed manufacturing loop.

**Gate 1 hardening/recovery/alerts -> Gate 2 identity/operator -> complete Gates 3–5 commercial/Order/Project -> Gate 6 verified physical/material truth -> Gate 7 production/QC -> Gate 8 measured capacity -> delivery -> Gate 9 actual cost/contribution -> real v1 pilot -> Gate 10 automation -> Gate 11 AI -> Gate 12 partners.**

Physical data collection can proceed during hardening. F1.5 AI, F3.5 scene visualization and F4 marketing intelligence are deferred until they support, rather than distract from, the closed-loop critical path. Existing deterministic public configurator remains.

Evidence and acceptance gates: [system reconciliation](SYSTEM_RECONCILIATION_2026-09-28.md).

## F0 — Foundation / Sprint 0
Goal: create a boring, reliable engineering foundation.

Deliverables:
- monorepo bootstrap
- environment/config validation
- database connection + migrations
- authentication integration boundary
- Organization/User/Role/Permission foundation
- module-boundary conventions
- audit/event foundations
- CI checks
- test harness
- observability/error reporting baseline
- local development documentation

Exit criteria:
- fresh developer/agent can clone and run the project
- CI validates lint/typecheck/tests
- one minimal authenticated vertical slice works end to end
- migrations are reproducible
- no secrets are committed

## F1 — Sales Foundation
Goal: turn incoming interest into structured, measurable sales work.

Scope:
- persons/companies/customer accounts
- lead sources and attribution touchpoints
- leads and opportunities
- product families/products
- first configuration schema
- quote/pricing engine foundation
- quote versioning
- margin visibility
- basic customer communication history

Key outcome:
`lead -> configuration -> price calculation -> quote` works coherently.

## F1.5 — AI Product Configurator MVP
Goal: create a customer-facing acquisition/configuration surface connected to the same core data.

Scope:
- guest ConfigurationSession
- mobile-first product/configuration flow
- schema-driven options
- AI guided discovery/advice
- save/resume after identification
- indicative pricing
- request quote / create sales intent
- basic attribution continuity

Do not build full room visualization until the structured configuration loop is reliable.

## F2 — Order, Project and Customer Portal
Goal: convert accepted commercial truth into operational work and customer continuity.

Scope:
- quote acceptance
- Order / OrderItem
- payment schedule/payment state
- Project / Task
- documents/approvals
- customer portal history
- configuration/quote/order visibility
- basic project status

## F3 — Materials & Production
Goal: connect sold work to physical execution and actual cost.

Scope:
- material types/items/locations
- reservations and movements
- suppliers/purchase requests where needed
- workflow templates
- production jobs/operations
- time entries
- quality checks/issues/rework
- basic capacity data

## F3.5 — Scene Visualization
Goal: let customers visualize configured products in their own environment.

Scope:
- RoomScene / SceneMedia
- upload/photo capture
- AI scene analysis with confidence
- VisualizationRequest/Result history
- configured product placement/arrangement generation
- saved designs/refinements
- privacy/retention controls

## F4 — Acquisition & Marketing Intelligence
Goal: connect content/marketing effort to profitable outcomes.

Scope:
- content entities
- campaign attribution
- TikTok/Google/other integrations where technically/legal feasible
- first-touch/last-touch/multi-touch analysis
- revenue/margin by source/content
- reactivation/referral loops

## F5 — Automation Platform
Goal: remove repetitive coordination work safely.

Scope:
- domain event/outbox workers
- automation rules/runs
- retries/dead-letter/idempotency
- reminders/follow-ups
- automatic task creation
- payment/material/production alerts

## F6 — Intelligence Layer
Goal: use historical truth to improve decisions.

Scope:
- AI Context Builder
- similar-project retrieval
- quote support
- risk detection
- forecasting
- margin/cost anomaly detection
- capacity/date recommendations
- structured AI feedback signals

Progress L1/L2 -> selected L3 actions with approval.

## F7 — Partner / Distributed Manufacturing Network
Goal: coordinate external woodworking capacity as a controlled extension of Avitus operations.

Scope:
- partner organizations/users
- capability registry
- machine/process/material capabilities
- availability/capacity
- external WorkOrder
- documentation/spec sharing
- scoped communication
- quality gates
- progress monitoring
- settlement
- partner scorecards
- API/webhook integration

## F8 — Platform / SaaS / Marketplace
Goal: productize the core for additional organizations where validated by business demand.

Potential scope:
- mature tenant isolation
- organization onboarding
- plan/feature policy
- external APIs
- regional/localization configuration
- marketplace/network matching
- billing for SaaS/network services

Do not build this phase merely because it is architecturally possible.

## Continuous workstreams
Across all phases:
- security and GDPR/privacy
- data quality and legacy migration
- auditability
- backup/restore testing
- performance/observability
- UX/design system
- documentation and decision log
- ROI measurement for AI/automation
