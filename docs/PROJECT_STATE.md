# Avitus Materia OS — Project State

**Checkpoint:** 0
**Date:** 2026-09-26
**Status:** Architecture / pre-implementation

## Identity
- Brand: **Avitus Materia**
- Main domain: **Avitus-Materia.com**
- Repository: `dudsi101-svg/Avitus-Materia-OS`
- Previous brand: Drakkar — treated strictly as legacy/history due to name collision; migrate data and recognition, do not embed the old brand into core code.

## Product definition
Avitus Materia OS is intended to become the central AI-native operating and sales system for Avitus Materia, covering the customer journey and operating flow from acquisition through production and after-sales.

Canonical value flow:

`MARKET -> CONTENT -> LEAD -> CUSTOMER -> CONFIGURATION -> QUOTE -> ORDER -> PROJECT -> MATERIAL -> PRODUCTION -> DELIVERY -> FINANCE -> RELATIONSHIP -> DATA -> AUTOMATION -> AI`

It is not intended to be merely a CRM, ERP, store, production panel or chatbot.

## Accepted direction
- Monorepo
- Modular monolith initially
- API-first
- Event-aware / durable event-outbox direction
- PostgreSQL as primary relational source of truth
- PWA / responsive / mobile-first interfaces
- Object storage for files/media
- External proven authentication provider + MFA
- AI Gateway must remain model-agnostic
- Strong auditability for critical business actions
- Single-company UX first; multi-organization domain model from day one

## Core principle
**DATA TRUTH -> AUTOMATION -> INTELLIGENCE**

Reliable data and domain rules precede automation; automation precedes autonomous AI.

## Core domains identified
- IAM / Organization
- Acquisition / Attribution
- CRM / Customers / Opportunities
- Catalog / Products
- Configurator
- Pricing / Quotes
- Orders
- Projects
- Materials / Inventory
- Purchasing
- Production / Quality
- Logistics / Installation
- Finance / Profitability
- Communications
- Automation
- Intelligence / AI
- Integrations
- Audit
- Scheduling / Capacity
- Visualizations
- Partner network

## Core data/model decisions
- `Organization` is foundational; business entities are organization-scoped where appropriate.
- `Order` and `Project` are distinct concepts.
- `Quote` has immutable `QuoteVersion` records.
- `PriceCalculation` is separate from final sale price.
- Important materials may have individual digital twins (`MaterialItem`) and QR/location/status history.
- Inventory truth is based on movements/reservations, not a casually overwritten stock number.
- Production is modeled as jobs + operations + workflow templates.
- Critical changes create audit records; business changes emit meaningful domain events.
- AI acts through controlled domain tools/services rather than arbitrary production DB access.

## Customer-facing strategic pillar
The **AI Product Configurator & Customer Experience** is a core system surface. It should eventually support:
- guided product selection and configuration
- AI conversational help
- configuration/version history
- live or estimated pricing
- lead-time and capacity-aware delivery estimates
- customer account/portal continuity
- uploading a photo of the room/location
- AI analysis of the scene
- generated arrangement/visualization of the configured product in that environment
- saving and comparing variants
- handoff to quote/order/human advisor

## Future partner-network pillar
The architecture must not block a future environment coordinating woodworking subcontractors/partners. Future capabilities may include:
- partner organizations
- capability/machine/process registry
- capacity and availability
- work orders for elements/processes/products
- documentation sharing
- scoped permissions
- quality gates and inspection
- progress monitoring
- settlement
- API/webhook integration with partners' own systems
- distributed manufacturing orchestration

## AI maturity model
- L1 Observer
- L2 Advisor
- L3 Operator with approval
- L4 Autonomous within explicit policy boundaries

Initial implementation should prioritize L1/L2 while preserving a safe path to L3/L4.

## MVP direction
First useful slice should focus on business value:
- CRM/leads/customers/sources
- product/configuration foundation
- quote/pricing/versioning/margin
- order/payment schedule
- project/tasks
- simplified materials/inventory
- command center
- audit
- AI L1/L2 assistance

Do not prematurely build full SaaS multi-tenancy, marketplace, full MES, full accounting, proprietary CAD, Kubernetes or many microservices.

## Current documentation state
- Core domain v0.1: captured in prior design work
- Data model v0.2: captured in prior design work
- Domain rules/state machines v0.3: captured in prior design work; one user backup is incomplete near the end, so canonical rules should be consolidated before implementation
- Technical architecture v0.4: next major architecture deliverable
- AI Product Configurator specification: being promoted to a first-class document now

## Immediate next steps
1. Consolidate architecture decisions in `docs/DECISIONS.md`.
2. Finalize `docs/AI_PRODUCT_CONFIGURATOR.md`.
3. Produce Technical Architecture v0.4 with concrete stack choices.
4. Define Sprint 0 bootstrap scope.
5. Only then create implementation scaffolding.

## Risk: context loss
Chat history has become long enough that relying on conversation alone is unsafe. From this checkpoint onward, material decisions must be persisted in the repository. Repository documentation is the project memory.
