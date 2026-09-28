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

## DD-023 — Coordination protocol and shared-identifier reservations
**Status:** Accepted

Parallel agent lanes must claim work and reserve shared sequential identifiers (migration numbers, `DD-NNN` IDs, sprint numbers) in `docs/WORK_BOARD.md` before coding, following `docs/COORDINATION.md`. `pnpm lint` runs `scripts/verify-coordination.mjs`, which rejects duplicate migration prefixes and duplicate decision IDs.

Reason: two parallel "Sprint 3" lanes collided on migration `0003`, `DD-022`, the sprint document and composition-root files because no repository channel announced active work.

## DD-024 — Customer identity precedes Quote READY/SENT governance
**Status:** Accepted

A commercial Quote cannot truthfully become customer-ready unless the system has an authoritative buyer identity and contact context.

Therefore `Person`, `Company`, `CustomerAccount` and `ContactPoint`, plus explicit sales links, are implemented before VAT/discount/approval and `READY/SENT` Quote transitions.

Customer identity must not be represented only as free text in a Lead, Opportunity, message or Quote PDF. Quote governance will consume CustomerAccount as source of truth and will later snapshot buyer data into the legally/business-significant QuoteVersion representation.

PII should not be copied unnecessarily into append-oriented audit/event payloads.

## DD-025 — Public configurator requests are immutable intake snapshots
**Status:** Accepted (Sprint 5)

A customer configuration sent from the public website creates a CRM Lead and an immutable `PublicConfigurationRequest` holding the chosen product (id + SKU/name snapshot), option values and the Core readiness assessment. It does **not** create an Opportunity or Configuration automatically; sales qualifies it first. No customer-facing price is shown until pricing rules are approved by the owner. Only active `CONFIGURABLE` products are exposed publicly, without internal price fields. Details: `docs/IMPLEMENTATION_SPRINT_5.md`.

## DD-026 — Option presentation lives in the catalog, not in UI code
**Status:** Accepted (Sprint 5b)

Customer-facing presentation of catalog options (group, hint, slider step, choice labels, descriptions, swatches) is stored as `product_option_definitions.presentation` (migration `0006`). It never changes what the Core accepts: validation stays in the typed columns (`data_type`, ranges, `choices`). The catalog parses presentation defensively (malformed data is ignored) and the public projection exposes it. New options and products are added as data; the website renders NUMBER, ENUM, BOOLEAN and TEXT options generically. Configurations are shareable through URL parameters that are re-validated against the catalog on load.

## DD-027 — Conversion of public configuration requests is explicit, atomic and one-time
**Status:** Accepted (Sprint 6)

An operator converts a `PublicConfigurationRequest` into an Opportunity (on the request's Lead) plus Configuration v1 with the customer's exact values, re-validated against the current catalog. `crm` and `configurator` expose pure creation builders; acquisition persists their output through the modules' repositories in one Unit of Work with a conversion record whose primary key is the request id (one-time, concurrency-safe; conflicts return HTTP 409). The intake record remains immutable. Details: `docs/IMPLEMENTATION_SPRINT_6.md`.

## DD-028 — QuoteVersion is the immutable customer-ready commercial snapshot
**Status:** Accepted (Sprint 8)

`CustomerAccount` is the mutable source of current customer truth, while each customer-ready `QuoteVersion` snapshots the buyer identity and commercial terms actually used for that version. The snapshot may contain the buyer display/legal identity and selected contact context needed for the commercial document, but append-only audit/domain-event payloads continue to carry identifiers and non-sensitive commercial summaries rather than buyer PII.

Tax is explicit input/policy (`tax_rate_bps`) and must not be silently inferred as one universal VAT rate. Discounts are explicit, require a reason, and every non-zero discount in the first governance slice requires a human approval before the Quote can become `READY`. Commercial margin is recalculated from the actual post-discount net selling amount; tax is not counted as margin.

`READY` is a deterministic business gate: the current configuration/pricing must still be current, the Opportunity must have an authoritative `CustomerAccount`, the current QuoteVersion must contain the matching buyer snapshot, validity and tax policy must be present, and any discount approval must be satisfied. `SENT` is a controlled transition only from `READY`, not a UI label. Customer-ready/sent versions are not mutated in place; later commercial changes require a new immutable version under the existing version-history rules.

Details: `docs/IMPLEMENTATION_SPRINT_8.md`.

## DD-029 — Accepted QuoteVersion is the commercial source for Order; Project is separate execution
**Status:** Accepted direction (Sprint 9)

Customer acceptance is an explicit governed transition on a specific current QuoteVersion. Only that accepted immutable version may become the commercial source of an `Order`; Order totals, currency, configuration reference and buyer snapshot are copied/referenced from accepted commercial truth rather than recomputed from current mutable data.

Quote-to-Order conversion is one-time and concurrency-safe. `Order` records the commercial commitment; `Project` is a separate operational aggregate linked to the Order and configuration, in accordance with DD-018. Creating operational work must not rewrite the accepted QuoteVersion.

The first Project state is planning-oriented and does not contain an invented promised completion date. Customer-facing production/delivery promises require later BusinessCalendar/capacity truth.

Details: `docs/IMPLEMENTATION_SPRINT_9.md`.

## Open decisions for Technical Architecture v0.4
- Authentication provider
- Object storage provider
- queue/job mechanism
- observability stack
- search/vector implementation timing
- AI Gateway provider/adapters
