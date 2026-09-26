# Avitus Materia OS — Data Model v0.2 (Consolidated)

**Primary database:** PostgreSQL
**Architecture:** modular monolith, API-first, event-aware
**Tenancy direction:** single-company UX first, multi-organization-ready model

## 1. Data principles
The model must preserve:
1. one authoritative source for each business fact
2. history of critical changes
3. controlled duplication only where intentional/read-optimized
4. automation readiness
5. AI readiness
6. organization scoping
7. future extensibility without rewriting the core

## 2. Organization and identity
### Organization
Core fields:
- `id UUID PK`
- `name`, `slug`, `legal_name`, `tax_id`
- `default_currency CHAR(3)`
- `default_language`
- `timezone`
- `status`
- `settings JSONB`
- timestamps

First organization: Avitus Materia, but code must not assume only one organization exists.

### User / OrganizationUser / Role / Permission
Users are global identities; membership/role belongs to an organization.

Permission examples:
- `crm.lead.read/write`
- `quote.read/create/approve`
- `inventory.read/reserve`
- `production.manage`
- `finance.read/manage`
- `ai.execute`

## 3. People, customers and sales
### Person
Organization-scoped contact identity. Not every person is a customer.

### Company
B2B party/legal business entity.

### CustomerAccount
Represents the commercial relationship and may point to a Person or Company.

Types may include `B2C`, `B2B`, `ARCHITECT`, `PARTNER`, `DEALER`, `OTHER`.

### Lead
Suggested fields:
- person/company references
- source
- assigned user
- title/status/priority
- estimated value/currency
- score
- first/last contact
- next action
- lost reason
- flexible metadata

### AttributionTouchpoint
Preserve touchpoint history rather than only one `lead.source`.

Fields may include channel, campaign/content references, UTM values, external reference, timestamp and metadata.

### Opportunity
Represents a concrete sales opportunity. A customer can have multiple opportunities over time.

## 4. Catalog and configuration
### ProductFamily
Grouping such as tables, benches, doors, stairs, wall panels, old oak/decor/custom furniture.

### Product
Key fields:
- family
- SKU/name/slug/description
- `product_type`: STANDARD / CONFIGURABLE / CUSTOM / SERVICE
- active
- optional base price
- default currency
- production workflow template reference

### ProductOptionDefinition
Schema-driven options such as length, width, thickness, wood, edge, legs and finish.

### Configuration
Suggested fields:
- opportunity/customer reference
- product
- status/version
- `configuration_data JSONB`
- created-by user/AI
- timestamps

Use a hybrid relational + JSONB approach: keep economically/operationally important facts queryable and relational; use JSONB for rapidly evolving flexible option structures.

### ConfigurationVersion
Add immutable significant snapshots for comparison, visualization, pricing and acceptance.

## 5. Quotes and pricing
### Quote
Commercial container with customer/opportunity, quote number, status, currency, current version, validity, owner and acceptance/rejection timestamps.

### QuoteVersion
Immutable significant version after sending.

Important fields:
- version number
- subtotal/discount/tax/total
- estimated cost/margin/margin percent
- pricing snapshot
- creator (human/AI)
- reason
- timestamp

Constraint: unique `(quote_id, version_number)`.

### QuoteItem
References product/configuration where applicable and stores quantity, price, estimated cost, tax and line totals.

### PriceCalculation
Separate from QuoteVersion.

Suggested fields:
- quote/configuration reference
- calculation version/currency
- material/labor/machine/outsourcing/transport/packaging/other costs
- total cost
- target margin
- recommended price
- minimum/economic floor
- final proposed price
- algorithm version
- input/output snapshots

This allows historic explanation: "why was this product priced this way?"

### CostComponent
Detailed components: MATERIAL, LABOR, MACHINE, OUTSOURCING, TRANSPORT, PACKAGING, FINISH, OTHER.

### Discount
Separate business entity/event with value/type/reason/requester/approver.

## 6. Orders and payments
### Order
Fields include customer, quote, order number, status, currency, amounts, owner and lifecycle timestamps.

### OrderItem
Points to product/configuration and preserves commercial line values.

### PaymentSchedule
Supports staged structures such as 50/40/10 or other policies.

### Payment
Immutable once booked/paid; corrections use reversal/new records rather than destructive edits.

## 7. Projects and tasks
### Project
Operational realization distinct from Order.

Fields include order, project number/name, status/priority, owner, planned/actual dates and progress.

### ProjectStage / Task / TaskDependency
Tasks may be assigned to users/teams and can depend on other tasks.

### ChangeRequest
Required for significant post-acceptance changes to configuration/order/project/production.

## 8. Materials and inventory
### MaterialType
Defines type/category/default unit and metadata.

### MaterialBatch
Represents a purchase/receipt batch and links to supplier/purchase order.

### MaterialItem
Individual physical element/digital twin where useful.

Suggested fields:
- batch/type/location
- serial/QR
- status
- dimensions and volume
- moisture
- quality grade
- unit cost
- metadata/media references

Possible statuses:
`AVAILABLE`, `INSPECTING`, `RESERVED`, `ALLOCATED`, `IN_PRODUCTION`, `PARTIALLY_CONSUMED`, `CONSUMED`, `DAMAGED`, `WASTE`, `SOLD`, `ARCHIVED`.

### InventoryLocation
Hierarchical location: site -> warehouse -> rack -> level, etc.

### MaterialReservation
Links material to project/order item, with reserve/release/consume timestamps.

### InventoryMovement
First-class event record, e.g. RECEIPT, TRANSFER, RESERVATION, RELEASE, CONSUMPTION, WASTE, CORRECTION, RETURN.

Do not model inventory truth as only an overwritten `stock = stock - 1` value.

## 9. Purchasing
- Supplier
- PurchaseRequest
- PurchaseOrder
- PurchaseOrderItem
- GoodsReceipt
- SupplierInvoice reference

Preserve expected delivery and actual receipt timings for later forecasting.

## 10. Production
### WorkflowTemplate / WorkflowOperationTemplate
Versioned process definition, optionally per product family.

### ProductionJob
Links project/order item to a workflow and holds schedule/team/status.

### ProductionOperation
Holds operation state, workstation/user, planned/actual dates and estimated/actual minutes.

### Machine / Workstation
Include site, type/status, capacity and hourly cost where useful.

### TimeEntry
Tie work time to user + project/operation/task and snapshot hourly cost for historic truth.

### QualityCheck
Persist pass/fail/conditional result and checklist snapshot.

### ProductionIssue
Capture severity, root cause, resolution and times. These become high-value learning data for AI and quality improvement.

## 11. Logistics
### Shipment
Order/carrier/tracking/status/planned and actual dispatch/delivery/cost.

### Installation
Order/project/address/schedule/team/status/completion/notes.

## 12. Finance layer
OS is not full accounting in MVP, but it needs economic truth.

### Transaction
Can link to project/order and store type/category/amount/currency/source/external reference.

### ProjectFinancialSnapshot
Point-in-time revenue/cost/margin snapshot, including material, labor, machine, outsourcing, logistics and other costs.

This enables margin drift analysis rather than only an end result.

## 13. Communications and acquisition content
### Conversation / Message
Channels may include EMAIL, WHATSAPP, MESSENGER, INSTAGRAM, WEB_CHAT, SMS, PHONE_NOTE and INTERNAL.

Important commercial communication should not exist only on an employee's private device.

### MarketingContent
Track platform/external ID/type/title/url/publication/campaign and metadata so content can eventually be connected to leads, orders, revenue and margin.

## 14. Automation, events, audit and AI
### AutomationRule / AutomationRun
Version rules and persist run status/input/output/error. Include idempotency.

### DomainEvent
Fields:
- id / organization
- event type
- aggregate type/id
- event version
- payload
- occurred_at
- correlation/causation IDs
- actor type/id

### AuditEvent
Different from DomainEvent. Preserve actor, entity, action, before/after data, reason and technical request metadata where appropriate.

### AIRecommendation
Type/entity/title/description/confidence/model/version/context hash/status/review time.

### AIAction
Agent/action/entity/risk/approval/input/output/status/execution details.

Risk: LOW / MEDIUM / HIGH / CRITICAL.

## 15. Integrations
### IntegrationConnection
Provider/status/encrypted configuration/last sync. Never store OAuth tokens or secrets as plaintext.

### ExternalReference
Map internal entities to external provider IDs/URLs without contaminating core IDs.

## 16. Data conventions
- UUID for stable IDs.
- `NUMERIC(19,4)` or equivalent decimal for money, never float.
- ISO currency code alongside monetary values.
- UTC / `TIMESTAMPTZ` internally.
- Canonical production dimensions may use millimeters; frontend can convert units.
- Soft delete for critical records where deletion is appropriate.
- Important historical entities are append/version oriented.
- Media lives in object storage; DB stores metadata/checksum/storage key.
- PII must be logically classifiable and access-controlled.

## 17. Database vs domain vs policy validation
- DB constraints: technical integrity, e.g. positive amount, valid dates.
- Domain rules: business invariants, e.g. cannot accept a nonexistent quote version.
- Policy: organization-specific decisions, e.g. salesperson discount limit.

## 18. Transaction/event reliability
Critical command example `AcceptQuote` should atomically persist business state + audit/domain event/outbox intent as appropriate.

Use a durable outbox when event consumers/async side effects are introduced.

External callbacks/webhooks/automations require idempotency keys.

## 19. AI context access
AI should not query arbitrary raw tables by default. Build scoped context services such as:
- customer context
- quote context
- project context
- production context

This improves privacy, cost control, relevance and auditability.

## 20. Historical intelligence
Long-term advantage comes from connecting similar historic projects to:
- actual production time
- actual material consumption/cost
- problems/rework
- sale price
- realized margin
- customer outcome

Imported/AI-derived data should support source/confidence/verification metadata.

## 21. Legacy migration
Drakkar data migration should follow:
`Extract -> Normalize -> Classify -> Deduplicate -> Validate -> Import -> Audit`

Imported uncertain data should retain source/confidence rather than being silently treated as verified truth.

## 22. MVP database cut
Prioritize tables/entities for:
- organization/identity
- person/company/customer account
- lead/source/opportunity/attribution
- product/family/options/configuration/version
- quote/version/item/pricing/costs
- order/item/payment schedule/payment
- project/task/change request
- material type/item/reservation/movement
- production job/operation
- conversation/message
- domain events/audit events
- AI recommendations/actions
- integration connections

Add deeper purchasing/logistics/finance/workflow tables incrementally as vertical slices require them.
