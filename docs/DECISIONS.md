# Avitus Materia OS — Decision Log

This file records accepted or strongly proposed product/architecture decisions. Significant changes require a new decision entry rather than silent replacement.

## DD-001 — Product category
**Status:** Accepted

Avitus Materia OS is a central operating-and-sales system, not merely a CRM or ERP.

## DD-002 — Brand and legacy
**Status:** Accepted

The current brand is **Avitus Materia**. `Drakkar` is legacy/history only and must not appear in new core domain naming.

## DD-003 — Core vs implementation
**Status:** Accepted

Avitus Materia is the first implementation of a generic core. Core concepts must not hard-code specific employees, halls, products, suppliers or prices.

## DD-004 — Development sequence
**Status:** Accepted

`DATA TRUTH -> AUTOMATION -> INTELLIGENCE`

Structured truth and domain rules precede automations; automations precede autonomous AI.

## DD-005 — Repository/architecture style
**Status:** Accepted direction

Use a **monorepo + modular monolith + multiple application surfaces**. Do not start with polyrepo/microservices.

Target application surfaces may include admin, customer portal, configurator, production terminal, partner portal and API, but create them only when needed.

## DD-006 — Multi-organization readiness
**Status:** Accepted

Design single-company UX first, but model organizations explicitly from day one. Use `organization_id` on relevant business entities. Preserve a path to partner organizations, SaaS and distributed manufacturing.

## DD-007 — API and events
**Status:** Accepted

Use API-first boundaries and meaningful domain events. Critical business transactions should use a durable outbox/event mechanism when asynchronous side effects are introduced.

## DD-008 — Database
**Status:** Accepted

PostgreSQL is the primary relational source of truth. Important business truth should be relational; JSONB may be used for flexible configuration/metadata where appropriate.

## DD-009 — Immutable business history
**Status:** Accepted

Sent/accepted quote versions and other legally/business-significant historical facts are not destructively overwritten. Use versions, reversals or change requests.

## DD-010 — Auditability
**Status:** Accepted

Critical changes such as price, discount, specification, promised date, payment, cancellation, material override and high-risk AI actions require audit history.

## DD-011 — AI database access
**Status:** Accepted

AI does not receive unrestricted direct write access to production databases. AI uses explicit tools/domain services under permissions, validation, policy, approval and audit controls.

## DD-012 — AI maturity
**Status:** Accepted

Design toward L4 autonomy but implement progressively:
- L1 Observer
- L2 Advisor
- L3 Operator with approval
- L4 Autonomous inside explicit policy

Initial product focus: L1/L2.

## DD-013 — Product Configurator importance
**Status:** Accepted

The AI Product Configurator is a core product surface, not a marketing widget. It must share domain data with CRM, catalog, pricing, scheduling, visualization, quotes and eventually production.

## DD-014 — Customer scene visualization
**Status:** Accepted direction

Customers should eventually be able to photograph/upload the location where the product will stand, have AI analyze the environment and generate arrangement/placement visualizations connected to the configured product.

## DD-015 — Partner/manufacturing network
**Status:** Accepted long-term direction

Architecture must preserve a path to a network of woodworking partners/subcontractors capable of performing elements, processes or whole products. Future system concepts include partner organizations, capability registry, capacity, work orders, scoped collaboration, quality gates, monitoring and settlement.

## DD-016 — Production modeling
**Status:** Accepted

Production is modeled as configurable workflow templates -> production jobs -> operations, not a single generic status field.

## DD-017 — Inventory/material model
**Status:** Accepted direction

Important material may be represented as individual digital twins (`MaterialItem`) with dimensions, quality, cost, location, status, reservations and history. Inventory movements are first-class records.

## DD-018 — Order vs Project
**Status:** Accepted

`Order` is the commercial commitment; `Project` is the operational execution. They are separate entities.

## DD-019 — Pricing model
**Status:** Accepted

`PriceCalculation` is separate from `QuoteVersion` and final selling price. Calculations should preserve algorithm/input/output snapshots sufficient to explain historic pricing.

## DD-020 — Infrastructure pragmatism
**Status:** Accepted

Do not introduce Kubernetes, many microservices or other hyperscale infrastructure before measured operational need. Preserve clean extraction boundaries instead.

## DD-021 — Repository as shared AI memory
**Status:** Accepted

GitHub documentation is the durable shared memory for Claude, GPT/Codex and future agents. Material decisions must not live only in chat history.

## DD-022 — Production deployment platform
**Status:** Accepted for v0.1

Use **Fly.io** as the primary production runtime for the first Avitus Materia release because an existing Fly workflow/account is already in use and the roadmap requires more than a static website.

Initial production topology:
- home.pl remains registrar and authoritative DNS,
- Fly App for public Next.js web,
- Fly App for NestJS API,
- Fly Managed Postgres for relational truth,
- Fly private network for service-to-service traffic where practical.

Keep web and API as separate Fly Apps so they can be deployed/scaled independently. Do not introduce Vercel/Railway unless a measured technical or operational limitation justifies splitting the platform later.

Default nearby European region for Poland is `fra` (Frankfurt), because Fly's former Warsaw `waw` region was deprecated. API and primary database should remain co-located in the same region.

## Open decisions for Technical Architecture v0.4
- Authentication provider
- Object storage provider
- queue/job mechanism
- observability stack
- search/vector implementation timing
- AI Gateway provider/adapters
