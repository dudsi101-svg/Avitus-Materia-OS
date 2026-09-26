# Avitus Materia OS — Core Domain Model v0.1

## System purpose
Avitus Materia OS models the real value flow of the company, not the screens of an application.

Canonical flow:

`MARKET -> CONTENT -> LEAD -> CUSTOMER -> CONFIGURATION -> QUOTE -> ORDER -> PROJECT -> MATERIAL -> PRODUCTION -> DELIVERY -> FINANCE -> RELATIONSHIP -> DATA -> AUTOMATION -> AI`

## Core vs implementation
### Avitus OS Core
Universal concepts:
- Organization / Identity
- Acquisition / Attribution
- CRM / Customer
- Product / Catalog
- Configuration
- Pricing / Quote
- Order
- Project
- Material / Inventory
- Purchasing
- Production / Quality
- Logistics / Installation
- Finance / Profitability
- Communication
- Automation
- Intelligence / AI
- Integrations / Audit

### Avitus Materia implementation
Specific employees, halls, products, suppliers, machines, customers and price lists are configuration/data, not hard-coded core logic.

## Major domain areas
### Command Center
Operational view answering: what is happening now, what needs attention, what is at risk, what is the financial/production outlook, and what AI recommends.

### Acquisition Engine
Tracks sources such as Avitus-Materia.com, TikTok, Google, Instagram, Facebook, Pinterest, YouTube, referrals, architects, partners and future channels. The goal is not just lead count but profitable attribution.

### CRM / Sales Engine
Lead -> qualification -> discovery -> opportunity -> configuration -> quote -> negotiation -> won/lost.

### Product & Configuration
Products may be STANDARD, CONFIGURABLE, CUSTOM or SERVICE. Configuration must support product-specific option schemas without forcing database migrations for every new option.

### Quote & Pricing
Pricing is a reproducible calculation, not a manually overwritten number. Quote history is versioned.

### Customer Portal
Customer-facing continuity for configurations, visualizations, quotes, approvals, payments, progress, media, delivery, invoices and service.

### Orders & Projects
`Order` = commercial commitment.
`Project` = operational realization.

### Materials & Inventory
Important material can have a digital twin with dimensions, moisture/grade, supplier/cost, location, media, QR, status and project reservation.

### Production
Production is a configurable workflow of jobs and operations, with quality gates and rework rather than a single generic status.

## Core entity catalog
### Organization / IAM
- Organization
- Site
- User
- OrganizationUser
- Role
- Permission
- Team

### CRM / Sales
- Person
- Company
- CustomerAccount
- ContactPoint
- Lead
- LeadSource
- AttributionTouchpoint
- Opportunity
- Conversation
- Interaction / Message
- Campaign
- Referral

### Product / Configuration
- ProductFamily
- Product
- ProductVariant
- ProductOptionDefinition
- Configuration
- ConfigurationVersion
- Specification
- MediaAsset

### Pricing / Quotes
- Quote
- QuoteVersion
- QuoteItem
- PriceCalculation
- CostComponent
- MarginRule
- Discount
- Approval

### Orders / Payments
- Order
- OrderItem
- PaymentSchedule
- Payment
- Document

### Projects
- Project
- ProjectStage
- Milestone
- Task
- TaskDependency
- Assignment
- ChangeRequest

### Materials / Inventory
- MaterialType
- MaterialBatch
- MaterialItem
- InventoryLocation
- InventoryMovement
- MaterialReservation
- WasteRecord

### Purchasing
- Supplier
- PurchaseRequest
- PurchaseOrder
- PurchaseOrderItem
- GoodsReceipt
- SupplierInvoice

### Production
- WorkflowTemplate
- WorkflowOperationTemplate
- ProductionJob
- ProductionOperation
- Workstation
- Machine
- TimeEntry
- QualityCheck
- ProductionIssue

### Logistics
- Shipment
- Delivery
- Installation
- Carrier
- DeliveryIssue

### Finance
- Transaction
- Revenue / Expense classification
- Allocation
- Invoice reference
- CostCenter
- Settlement
- ProjectFinancialSnapshot

### Automation / AI / Integration
- DomainEvent
- AuditEvent
- AutomationRule
- AutomationRun
- AIRecommendation
- AIAction
- Notification
- IntegrationConnection
- ExternalReference

## Source-of-truth principles
| Business fact | Source of truth |
|---|---|
| Person identity/contact | Person / ContactPoint |
| Customer relationship | CustomerAccount |
| Sales intent | Opportunity |
| Product | Product |
| Customer configuration | Configuration / ConfigurationVersion |
| Commercial offer | QuoteVersion |
| Pricing rationale | PriceCalculation |
| Commercial commitment | Order |
| Operational realization | Project |
| Material truth | MaterialItem + InventoryMovement/Reservation |
| Production state | ProductionJob + ProductionOperation |
| Payment | Payment / Transaction |
| Communication | Conversation / Message |
| AI action | AIAction |
| Critical history | AuditEvent |

PDFs, emails and AI answers are representations/evidence, not the authoritative business state by themselves.

## Core relationships
`Campaign/Content -> AttributionTouchpoint -> Lead -> Person/Company -> Opportunity -> Configuration -> PriceCalculation -> Quote/QuoteVersion -> Order -> Project -> ProductionJob/Operation -> Delivery`

Parallel relationships:
- Project <-> Tasks
- Project <-> MaterialReservations <-> MaterialItems
- Project <-> Purchases
- Project <-> Transactions/financial snapshots
- Project <-> Documents

## Shared entity conventions
Where appropriate:
- UUID identifiers
- `organization_id`
- timestamps
- actor/source metadata
- status
- version
- soft delete for critical business records
- audit/change reason for significant changes

## Domain-event examples
Sales:
- LeadCreated
- LeadQualified
- OpportunityCreated
- ConfigurationCompleted
- QuoteGenerated
- QuoteSent
- QuoteViewed
- QuoteAccepted
- QuoteRejected

Orders/payments:
- OrderCreated
- DepositRequested
- DepositReceived
- OrderConfirmed
- PaymentReceived
- PaymentOverdue

Materials/production:
- MaterialRequired
- MaterialReserved
- MaterialShortageDetected
- MaterialConsumed
- WasteCreated
- ProductionJobCreated
- ProductionScheduled
- ProductionStarted
- OperationCompleted
- ProductionBlocked
- QualityCheckFailed
- QualityCheckPassed
- ProductionCompleted

Logistics:
- ShipmentPlanned
- ShipmentDispatched
- DeliveryCompleted
- InstallationCompleted

Finance:
- CostRecorded
- MarginBelowThreshold
- ProjectCostOverrunDetected

## Example automation: QuoteAccepted
Expected side effects may include:
1. create Order
2. create payment schedule/deposit request
3. create Project
4. evaluate material requirements/availability
5. create capacity/planning work
6. notify responsible users
7. update customer portal

The acceptance itself and its audit/event record should be transactional; downstream side effects may be asynchronous and idempotent.

## AI architecture concept
AI uses explicit tools such as:
- `search_customer`
- `calculate_quote`
- `create_quote_draft`
- `compare_margin`
- `find_material`
- `reserve_material`
- `create_task`
- `schedule_production`
- `draft_customer_reply`
- `detect_project_risk`
- `forecast_revenue`

AI does not directly execute arbitrary production database mutations.

## MVP domain cut
Prioritize:
- organizations/users/roles
- persons/customer accounts
- lead sources/leads/opportunities
- product families/products/configurations
- quotes/quote versions/pricing/cost components
- orders/payment schedule/payments
- projects/tasks
- simplified materials/reservations
- production jobs/operations
- conversations/messages
- domain/audit events
- AI recommendations
- integration connections

## Long-term domain expansion
Preserve paths to:
- scene/visualization/configurator entities
- partner organizations and work orders
- capability/capacity registry
- distributed manufacturing
- SaaS multi-tenant operations
- marketplace/network coordination
