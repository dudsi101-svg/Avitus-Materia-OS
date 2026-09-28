# Next Action

_Updated 2026-09-28. Sprints 0–7 are merged. Production deploy run 48 for Sprint 7 completed successfully; API readiness verification passed. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Current verified position
- website v0.4 is the current public brand surface;
- `/kreator` is live and catalog-driven;
- public configuration requests create an immutable intake snapshot + Lead;
- Sprint 6 converts a request exactly once into Opportunity + Configuration v1 and hands it to pricing;
- Sprint 7 explicitly creates or selects a durable `CustomerAccount` and links the same account to both Lead and Opportunity;
- Sprint 7 API changes deployed successfully in Fly production run 48 and `/ready` verification passed;
- Draft Quote creation/revision already exists, but customer-ready governance is not implemented yet.

## Queue (in order)
1. **Sprint 8 — Quote governance:** consume the authoritative CustomerAccount from the Opportunity, snapshot buyer identity into the legally/business-significant QuoteVersion, add explicit tax/discount policy, recompute commercial margin after discount/tax inputs, and introduce controlled `DRAFT -> READY -> SENT` transitions.
2. **Production journey smoke:** once a production-accessible operator surface exists, exercise public configurator submission → conversion → customer identity → pricing → governed Quote. Until then, keep the API/E2E journey as the release gate and record any production-only incident immediately.
3. **Order + Project:** only an accepted governed Quote should become the commercial Order; operational execution remains a separate Project per DD-018.
4. **Operational truth before promises:** BusinessCalendar + capacity/availability estimates before customer-visible delivery promises.
5. **AI/visualization:** room-photo analysis and generated visualization after the customer/configuration/quote journey and production observability are stable.

## Sprint 8 design constraints
- do not mutate historical buyer/commercial truth after a QuoteVersion becomes customer-ready;
- CustomerAccount is the source of current customer truth, but QuoteVersion gets an immutable buyer snapshot;
- tax must be explicit data/policy, not a hidden hard-coded assumption;
- discounts must preserve reason, actor and resulting margin;
- transition to READY must fail if buyer identity, commercial totals or validity data are incomplete;
- SENT is a governed state change, not merely a UI label;
- PII stays out of append-oriented domain event/audit payloads except identifiers and non-sensitive commercial summaries.
