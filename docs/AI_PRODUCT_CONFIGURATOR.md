# Avitus Materia OS — AI Product Configurator & Customer Experience v0.1

**Status:** Strategic specification
**Priority:** Core product pillar

## 1. Purpose
The configurator is not a standalone marketing widget. It is the customer-facing entry point into Avitus Materia OS and must connect discovery, inspiration, AI assistance, product configuration, visualization, price/lead-time estimation, CRM, quote generation and later execution.

Its job is to reduce friction between **"I like this idea"** and **"I am ready to buy this specific product"**.

## 2. Primary customer outcomes
A customer should eventually be able to:
- discover a product or arrive from TikTok/Google/social/content
- start without creating an account
- choose a product family or describe a need in natural language
- receive AI guidance appropriate to the product and room/context
- select dimensions, material, finish, edge, base/legs and other parameters
- see valid combinations and understand trade-offs
- save multiple variants
- compare variants
- see an indicative or exact price depending on data quality
- see realistic lead-time/availability estimates
- upload or photograph the place where the product will stand
- let AI analyze the room/scene and relevant proportions/style constraints
- generate an arrangement/visualization with the configured product in that environment
- refine configuration from the visualization
- continue the same session later from account history
- ask questions conversationally
- request human assistance at any moment without losing context
- convert the configuration into a quote/order workflow
- later track the resulting order/project in the same customer portal

## 3. Strategic role in the funnel
Preferred flow:

`TikTok / Google / Website / Referral / Architect`
`-> landing/product inspiration`
`-> configuration session`
`-> AI guided discovery`
`-> configured concept`
`-> room visualization`
`-> price + lead-time confidence`
`-> lead/opportunity`
`-> quote`
`-> acceptance`
`-> order/project`
`-> production/delivery`
`-> relationship/history/repeat purchase`

The configurator must preserve attribution so that the business can eventually know which content and configuration journeys create profitable orders.

## 4. UX modes
### 4.1 Quick mode
For customers who know roughly what they want.

Example:
`Table -> 220 x 100 cm -> oak -> natural edge -> black steel legs -> oil finish`

Goal: fast indicative result and lead capture.

### 4.2 Guided AI mode
Conversational assistant asks focused questions:
- What should the product solve?
- Where will it stand?
- How many people?
- Preferred style?
- Approximate room size?
- Desired material/finish?
- Budget range?
- Desired timing?

AI proposes configurations instead of forcing the customer through a long form.

### 4.3 Inspiration mode
Customer uploads photos/references or chooses a past Avitus realization. AI helps translate inspiration into a producible configuration.

### 4.4 Room/scene mode
Customer uploads/takes a photo of the target space. AI analyzes the scene and creates placement/arrangement proposals.

## 5. Customer experience principles
- Mobile-first; many sessions will originate from social media.
- Guest-first; do not require account creation before value is visible.
- Progressive disclosure; show complexity only when relevant.
- Never lose progress.
- Explain why an option is unavailable or changes price/time.
- AI should ask fewer, better questions.
- Human handoff is a first-class path, not a failure state.
- Premium visual quality matters because the product is premium/custom.

## 6. Core domain entities
### ConfigurationSession
Represents a customer/guest journey through the configurator.

Suggested fields:
- id
- organization_id
- person_id nullable
- lead_id nullable
- opportunity_id nullable
- source/attribution reference
- status
- started_at
- last_activity_at
- device/session metadata

### Configuration
Existing core entity representing the structured product configuration.

### ConfigurationVersion
Immutable/snapshotted significant versions used for comparison, pricing, visualization and quotes.

### ProductPreference
Soft preferences such as style, budget, visual taste, urgency.

### SavedDesign
Customer-named saved concept pointing to a configuration version.

### InspirationAsset
Uploaded or selected reference image/content.

### RoomScene
Represents the target physical context.

Suggested fields:
- id
- configuration_session_id
- address/room labels optional
- room_type
- approximate dimensions if known
- metadata

### SceneMedia
Uploaded photo/video or captured room media.

### SceneMeasurement
Optional manual/AI-derived measurements with source/confidence.

### VisualizationRequest
A request to generate a placement/render/arrangement.

### VisualizationResult
Generated output with model/version/prompt/context metadata and links to the exact configuration/scene versions used.

### AISuggestion
Structured product/style/dimension/material suggestion with confidence/reasons.

### LeadTimeEstimate
A point-in-time estimate derived from capacity/material/supplier assumptions.

### PriceEstimate
A customer-facing estimate tied to a PriceCalculation and confidence/validity rules.

## 7. State machine — Configuration Session
Suggested states:

`STARTED`
`DISCOVERY`
`CONFIGURING`
`VISUALIZING`
`PRICE_READY`
`LEAD_TIME_READY`
`READY_FOR_QUOTE`
`CONVERTED`
`DORMANT`
`ABANDONED`

Session state should not replace the underlying domain state of Configuration/Quote/Opportunity.

## 8. State machine — Configuration
Use the core direction:

`DRAFT -> INCOMPLETE -> READY_FOR_PRICING -> PRICED -> CUSTOMER_REVIEW -> APPROVED -> LOCKED`

Significant post-approval changes create a new version/change request rather than overwrite accepted truth.

## 9. AI assistant capabilities
### Product advisor
- map natural-language intent to product families/options
- explain materials and finishes
- recommend dimensions
- detect incompatible choices
- suggest alternatives

### Historical intelligence advisor
Use trusted historical project data to find similar realizations and eventually estimate:
- realistic work time
- common cost ranges
- typical issues
- final dimensions/materials
- achieved margin

Historical data must be scoped, privacy-safe and represented as evidence, not hallucinated facts.

### Scene/space assistant
- classify room/context
- detect approximate geometry when feasible
- identify style cues
- suggest scale/placement
- flag uncertainty
- ask for a second photo or manual measurement when confidence is insufficient

### Sales assistant
- answer product questions
- summarize configuration
- identify missing information
- encourage the next useful step without manipulative dark patterns
- hand off to human advisor with full context

### Pricing/availability assistant
Can explain estimates but should not invent price or dates. It must call pricing/scheduling services.

## 10. Image/visualization pipeline
Target conceptual flow:

`Scene photo upload`
`-> media safety/quality check`
`-> scene analysis`
`-> optional measurement/scale confirmation`
`-> selected ConfigurationVersion`
`-> visualization request`
`-> generated arrangement`
`-> customer feedback/refinement`
`-> saved VisualizationResult`

Every result should preserve:
- exact configuration version
- exact scene media/version
- generation model/provider/version
- generation parameters/context hash where appropriate
- timestamp

Generated visualization must be clearly treated as illustrative unless a technical design has been validated.

## 11. Calendar, capacity and lead time
The configurator should not expose a naive static "delivery in X weeks" if the OS can know more.

Long-term lead-time estimate should consider:
- current production capacity
- relevant workflow/workstations
- staffing capacity
- material availability/reservations
- supplier lead times
- subcontractor capacity where applicable
- logistics/installation constraints

Keep separate:
- `estimated/forecast date`
- `promised date`

A configurator estimate is not automatically a contractual promise.

## 12. Pricing integration
The configurator never owns final pricing truth.

Flow:
`ConfigurationVersion -> Pricing Engine -> PriceCalculation -> customer-facing PriceEstimate -> QuoteVersion`

Price may include:
- material
- waste factor
- labor
- machines
- components
- finishing
- design
- outsourcing
- packaging
- transport
- installation
- channel/transaction costs
- margin rules

The UI may show ranges when inputs are incomplete.

## 13. CRM integration
A guest session should not automatically create a noisy CRM lead at the first click.

Recommended stages:
- anonymous session
- engaged session
- identified visitor/person
- qualified intent
- Lead/Opportunity creation based on explicit action or scoring/policy

Attribution/touchpoints should survive conversion.

## 14. Customer portal integration
After identification/login, the customer should see:
- saved designs
- configuration history
- visualizations
- open questions
- quotes and versions
- approvals
- orders/projects
- payments
- progress/photos
- delivery/installation
- service/claims

The transition from configurator to portal must feel continuous.

## 15. Production integration
Do not allow customer-friendly configuration semantics to directly become machine instructions.

Use a translation path:
`Customer Configuration -> approved Specification -> technical/production interpretation -> ProductionJob/Operations`

This protects production from ambiguous visual or conversational inputs.

## 16. Security/privacy
Room photos may contain personal/private information. Requirements include:
- explicit purpose/consent language where required
- controlled access
- retention policy
- deletion/anonymization workflow where legally permitted
- no public reuse for marketing/training without separate authorization
- AI provider/data-processing review before production use

## 17. Analytics
Measure more than completion rate:
- entry source/content
- session completion
- step drop-off
- AI assistance usage
- visualization usage
- save/return rate
- identification rate
- lead/opportunity conversion
- quote conversion
- order conversion
- average order value
- margin by configuration path
- visualization-to-order lift
- time-to-quote

## 18. MVP cut
### MVP A — Structured Configurator Foundation
- product family/product selection
- schema-driven options
- configuration persistence/versioning
- mobile UX
- guest session
- save/resume after identification
- basic AI conversational guidance
- indicative pricing integration
- create lead/opportunity/request quote

### MVP B — Customer continuity
- customer portal history
- saved designs
- quote/version access
- AI context continuity
- basic lead-time estimate

### MVP C — Scene visualization
- room photo upload
- scene metadata
- visualization request/result history
- configured product placement/arrangement generation
- human/AI refinement

### Later
- more reliable measurement assistance
- AR/live camera placement where viable
- capacity-aware dynamic scheduling
- deep historical similarity engine
- distributed partner capacity
- autonomous low-risk sales follow-ups

## 19. Non-goals for the first implementation
- full CAD replacement
- engineering-grade dimensions inferred from a single photo without validation
- automatic legally binding delivery promises from uncertain forecasts
- unrestricted AI-generated pricing
- fully autonomous custom-project acceptance
- building proprietary image-generation foundation models

## 20. Success definition
The configurator succeeds when it measurably:
- increases qualified-lead conversion
- reduces time needed to understand customer requirements
- reduces quote preparation time
- improves quote accuracy
- increases customer confidence
- increases order conversion and/or average order value
- produces structured data useful for production and future AI

It should become a bridge between inspiration and manufacturable commercial reality.
