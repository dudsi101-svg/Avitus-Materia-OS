# Avitus Materia OS — Domain Rules & State Machines v0.3 (Consolidated)

## 1. Rule hierarchy
Each critical business entity has explicit states, allowed transitions, guards, actor responsibility, side effects, audit and domain events.

Do not set important statuses arbitrarily. Use validated transitions/commands.

Decision layers:
- **Domain rule** — invariant of the business model
- **Business policy** — configurable company rule
- **Automation policy** — when automated actions may execute
- **AI policy** — scope/approval limits for AI actions

Actors:
`USER`, `AI_AGENT`, `SYSTEM`, `INTEGRATION`, `CUSTOMER`, `PARTNER`.

Critical actions record actor, reason and timestamp.

## 2. Lead state machine
Suggested states:
`NEW -> CONTACT_PENDING -> CONTACTED -> QUALIFYING -> QUALIFIED -> DISCOVERY -> CONFIGURING -> QUOTE_PENDING -> QUOTED -> NEGOTIATION -> WON`

Alternative terminal/side states:
`LOST`, `DORMANT`, `DISQUALIFIED`.

Rules:
- Qualification requires enough context to understand need/contact/value/timing.
- Qualified discovery should produce an Opportunity.
- A lead/opportunity should normally become WON as a consequence of accepted commercial commitment, not by arbitrary manual status change.
- LOST requires a structured reason such as PRICE, NO_RESPONSE, COMPETITOR, TIMING, OUT_OF_SCOPE, CAPACITY, CUSTOMER_CANCELLED, LOW_QUALITY_LEAD or OTHER + note.

AI may propose lead score; score alone should not destructively reject a prospect without policy.

## 3. Opportunity
Suggested states:
`OPEN`, `DISCOVERY`, `SOLUTION_DEFINED`, `PRICING`, `PROPOSAL_SENT`, `NEGOTIATION`, `COMMIT`, `WON`, `LOST`, `ON_HOLD`.

Changes in estimated value should be historically traceable when material.

## 4. Configuration
Suggested states:
`DRAFT -> INCOMPLETE -> READY_FOR_PRICING -> PRICED -> CUSTOMER_REVIEW -> APPROVED -> LOCKED`

Side states: `SUPERSEDED`, `ARCHIVED`.

Once the accepted commercial version depends on a configuration, that version is locked. Significant later changes create a new ConfigurationVersion + ChangeRequest rather than overwrite history.

## 5. Change Request
Use for significant customer/business changes after acceptance.

Suggested states:
`REQUESTED -> IMPACT_ANALYSIS -> AWAITING_APPROVAL -> APPROVED -> IMPLEMENTED`

Alternatives: `REJECTED`, `CANCELLED`.

Impact analysis may include cost, time, capacity/material effect and downstream consequences.

## 6. Quote state machine
Suggested states:
`DRAFT -> INTERNAL_REVIEW -> READY -> SENT -> VIEWED -> NEGOTIATION`
then one of:
`ACCEPTED`, `DECLINED`, `EXPIRED`, `WITHDRAWN`, `REVISION_REQUIRED`, `SUPERSEDED`.

Rules:
- DRAFT -> READY requires customer/lead context, at least one item, pricing, currency, validity and payment terms.
- READY -> SENT requires a valid final calculation and approvals required by policy.
- A specific `QuoteVersion` is accepted, not an abstract mutable Quote.
- Once sent, a QuoteVersion is immutable. Corrections create the next version.
- Expired quotes may require repricing/material-cost refresh.

## 7. Discount and margin policy
Separate discount from price mutation.

Configurable policy may grant progressively larger approval limits to salesperson, manager and owner.

Maintain:
- `minimum_margin_percent`
- `target_margin_percent`

Falling below policy thresholds blocks or escalates for approval.

AI may recommend a discount and calculate its effect; it may not bypass margin/approval policy.

## 8. Order state machine
Suggested states:
`DRAFT -> PENDING_CONFIRMATION -> CONFIRMED -> PAYMENT_PENDING/PARTIALLY_PAID -> READY_FOR_PLANNING -> PLANNED -> IN_PRODUCTION -> READY_FOR_DELIVERY -> IN_DELIVERY -> DELIVERED -> INSTALLATION_PENDING -> COMPLETED`

Side states:
`ON_HOLD`, `CANCELLED`, `DISPUTED`.

Preferred creation trigger: `QuoteAccepted`.

Order creation preserves snapshots/references to accepted quote/configuration/price/terms.

## 9. Payment gate
Production may require receipt of a defined deposit or policy condition.

Starting despite an unsatisfied payment gate requires explicit override permission + reason + audit.

## 10. Cancellation
Confirmed-order cancellation is an assessed business process, not a raw status flip.

Potential assessment:
- purchased material
- work performed
- subcontractor commitments
- non-recoverable costs
- recoverable value
- refund amount

## 11. Project state machine
Suggested states:
`DRAFT -> PLANNING -> READY -> ACTIVE -> READY_FOR_DELIVERY -> DELIVERED -> COMPLETED`

Side states:
`BLOCKED`, `ON_HOLD`, `CANCELLED`.

Activation guard should consider approved scope, owner, baseline schedule, payment gate and essential material readiness.

Blocker categories may include MATERIAL, CUSTOMER_DECISION, DESIGN, MACHINE, STAFF, SUPPLIER, PAYMENT, QUALITY, OTHER.

Each blocker has owner/severity/open time/expected resolution. Long-lived blockers can trigger escalation.

## 12. Tasks
Suggested states:
`BACKLOG -> READY -> IN_PROGRESS -> REVIEW -> DONE`
with `BLOCKED` and `CANCELLED`.

Hard dependencies prevent readiness until predecessor completion; soft dependencies may only warn.

## 13. Production Job
Suggested states:
`DRAFT -> PLANNED -> MATERIAL_PENDING -> READY -> IN_PROGRESS -> QUALITY_CONTROL -> COMPLETED`

Side states:
`PAUSED`, `BLOCKED`, `REWORK`, `CANCELLED`.

READY should require sufficient material/documentation/workflow/resource readiness.

## 14. Production Operation
Suggested states:
`PENDING -> READY -> IN_PROGRESS -> COMPLETED`
with `PAUSED`, `BLOCKED`, `FAILED`, `REWORK_REQUIRED`, `SKIPPED`.

Completion may require time entry, material usage, operator/machine and quality result depending on the operation template.

## 15. Quality gates and rework
Operations marked `requires_quality_check` block downstream work until passing the required quality rule.

Failed check may create:
- ProductionIssue
- rework operation/task
- incremental cost
- incremental time

Track cost of rework/quality separately so the company can learn which failures are expensive.

## 16. Material state machine
Suggested states:
`AVAILABLE`, `INSPECTING`, `RESERVED`, `ALLOCATED`, `IN_PRODUCTION`, `PARTIALLY_CONSUMED`, `CONSUMED`, `DAMAGED`, `WASTE`, `SOLD`, `ARCHIVED`.

Reservation rules:
- sufficient unreserved quantity/item state
- compatible specification
- no invalid double allocation

AI may recommend material matching based on dimensions, moisture, grade, visual characteristics, cost and waste. Human overrides are allowed but should capture reason for future learning.

## 17. Waste
Waste is classified, not simply erased.

Possible classes:
`REUSABLE`, `SMALL_OFFCUT`, `FUEL`, `SAWDUST`, `SCRAP`, `SELLABLE`, `DISPOSAL`.

Future flow may turn reusable waste into secondary inventory/products.

## 18. Purchasing
PurchaseRequest states:
`DRAFT -> SUBMITTED -> APPROVED -> ORDERED -> PARTIALLY_RECEIVED -> RECEIVED`
with `REJECTED`, `CANCELLED`.

Approval thresholds are business policy, not hard-coded invariants.

AI may detect shortage, compare suppliers and prepare purchase orders; autonomous sending is allowed only under explicit policy.

## 19. Delivery and installation
Delivery states:
`PLANNING -> READY -> BOOKED -> DISPATCHED -> IN_TRANSIT -> DELIVERED`
with `FAILED`, `RETURNED`, `CANCELLED`.

READY may require production complete, quality passed, packed goods and payment conditions met.

Installation states:
`PLANNED -> CONFIRMED -> TRAVEL -> ON_SITE -> IN_PROGRESS -> CUSTOMER_ACCEPTANCE -> COMPLETED`
with `ISSUE`, `CANCELLED`.

Customer acceptance may be ACCEPT, ACCEPT_WITH_NOTES or REJECT; notes/issues create structured service/post-delivery cases.

## 20. Payments
Suggested states:
`EXPECTED -> PENDING -> PROCESSING -> PAID`
with `PARTIALLY_PAID`, `FAILED`, `OVERDUE`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`.

Booked payment history is immutable; corrections use reversal/new transaction semantics.

Overdue logic can drive escalating reminders/tasks, configurable by policy.

## 21. Customer account
Suggested states:
`PROSPECT`, `ACTIVE`, `VIP`, `DORMANT`, `AT_RISK`, `BLOCKED`, `ARCHIVED`.

Blocking requires reason, permission and audit.

## 22. Communication
Material communication about price, deadline, scope, complaints and changes must be captured in conversation history rather than existing only on private devices.

AI may answer low-risk FAQ/status/basic configuration questions. Escalate refunds, complaints, legal disputes, large discounts, severe frustration and unusual custom projects.

AI sentiment/risk classification is probabilistic evidence with confidence, not objective truth.

## 23. Automation runs
Suggested states:
`QUEUED -> RUNNING -> SUCCEEDED`
with `WAITING`, `FAILED`, `RETRYING`, `CANCELLED`, `DEAD_LETTER`.

Use idempotency and retry/backoff for integrations. Exhausted retries should create observable alerts/dead-letter handling.

## 24. AI recommendation/action workflow
Recommendation states:
`PENDING`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `SUPERSEDED`.

Risk matrix:
- LOW: AI may execute where policy allows (tagging, summaries, drafts)
- MEDIUM: execute only inside bounded policy (e.g. follow-up/task/provisional action)
- HIGH: human approval (price, binding date, meaningful purchase)
- CRITICAL: manual only (refund, destructive deletion, legal/bank-account changes)

Confidence thresholds should be use-case-specific, not one universal number.

## 25. Command Center alerts
Suggested alert levels:
`INFO`, `NOTICE`, `WARNING`, `CRITICAL`.

Examples:
- INFO new lead
- NOTICE quote not opened for several days
- WARNING forecast delay
- CRITICAL material shortage threatens promised date

## 26. Business calendar and capacity
Use a BusinessCalendar that understands weekends, holidays and production days.

Keep separate:
- `promised_delivery_date` — external commitment
- `forecast_delivery_date` — current system prediction

Capacity-aware estimates should eventually use materials, workstations, staff and supplier/subcontractor lead time.

If forecast exceeds promised date, emit `DeliveryRiskDetected` and surface corrective options.

## 27. Profitability guard
Track at least:
- estimated margin
- current forecast margin
- actual margin

Material cost drift, extra labor/rework and committed external cost may trigger `ProjectCostOverrunDetected` / margin alerts.

## 28. Project/customer health
Project health can synthesize schedule, budget, quality, material, payment and blockers into GREEN/YELLOW/RED.

Customer health can synthesize activity, payment, complaints and engagement into GOOD/ATTENTION/AT_RISK.

These are derived indicators, not source-of-truth replacements.

## 29. Sales learning
After LOST, capture structured reasons such as competitor, price gap and context.

After completed orders, continue relationship loops: satisfaction, care reminders, cross-sell, referral/repeat opportunities.

## 30. Service/warranty
Use ServiceCase with states such as:
`OPEN -> TRIAGE -> IN_REVIEW -> APPROVED/SCHEDULED -> IN_PROGRESS -> RESOLVED -> CLOSED`
with rejection where appropriate.

Capture product/order, severity, photos, root cause, resolution and cost. This is valuable future AI/quality data.

## 31. Manual override
Real businesses need exceptions. Model:
`rule -> controlled exception -> permission -> reason -> audit`.

Examples:
- start despite missing deposit
- accept margin below threshold
- reserve imperfect material

Overrides must be reportable.

## 32. Event semantics
Use meaningful past-tense events, e.g. `QuoteAccepted`, `PaymentReceived`, `ProductionBlocked`, not generic `RowUpdated`.

Command vs event:
- command `AcceptQuote` can fail
- event `QuoteAccepted` means the business fact happened

Use event schema/versioning as contracts evolve.

## 33. Key invariants
- Accepted/sent immutable versions are not overwritten.
- Payments do not disappear from history.
- Material cannot be invalidly double-reserved.
- AI cannot bypass approval policy.
- Critical price/date/specification changes are audited.
- Orders derive consistent totals from line/tax/discount rules.
- completed timestamps cannot precede starts.
- critical open issues can block completion where policy requires.

## 34. API/domain errors
Prefer stable error codes such as:
- `QUOTE_ALREADY_ACCEPTED`
- `MARGIN_BELOW_ALLOWED_LIMIT`
- `MATERIAL_ALREADY_RESERVED`
- `DEPOSIT_REQUIRED`
- `PROJECT_BLOCKED`
- `QUALITY_CHECK_REQUIRED`
- `PERMISSION_DENIED`
- `INVALID_STATE_TRANSITION`

Include correlation ID/details for observability.

## 35. Customer portal visibility
Customers see only customer-facing truth. Do not expose internal margin, supplier cost, internal notes, private risk assessments or other customers/partners.

Customer approvals of quote/configuration/visualization/date/change request should preserve actor, timestamp and version.

## 36. Data deletion/retention
A request to remove customer data is a controlled retention/legal process, not necessarily hard delete. Evaluate legal retention before deletion/anonymization.

## 37. Guiding principle
**CONTROLLED FLEXIBILITY**

The system should guide users through correct states/rules while allowing explicit, permissioned, auditable exceptions when reality demands them.
