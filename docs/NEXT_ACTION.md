# Next Action

_Updated 2026-09-28. Sprints 0–6 are merged. Production deploy run 41 for the current `main` completed successfully. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Current verified position
- website v0.4 is the current public brand surface;
- `/kreator` is live and catalog-driven;
- public configuration requests create an immutable intake snapshot + Lead;
- Sprint 6 converts a request exactly once into Opportunity + Configuration v1 and hands it to pricing;
- API production deployment after the Sprint 6 CI race fix succeeded and `/ready` verification passed in the deploy workflow;
- there are no open pull requests at the time of this update.

## Queue (in order)
1. **Sprint 7 — customer identity handoff:** from a converted configurator request, create or explicitly select a `CustomerAccount`, then link the same account to both the source Lead and the created Opportunity. Avoid silent deduplication and preserve the immutable intake record.
2. **Production smoke:** exercise the real browser journey end-to-end: public configurator submission → Command Center → conversion → customer link → pricing → Draft Quote. Record any production-only failure as an incident before adding features on top.
3. **Quote governance:** VAT/tax policy, discounts/margin approvals, READY/SENT transitions and buyer snapshot. Do not make a Draft Quote customer-binding before these rules exist.
4. **Operational truth before promises:** BusinessCalendar + capacity/availability estimates, then accepted Quote → Order / Project.
5. **AI/visualization:** room-photo analysis and generated visualization only after the basic customer/configuration/quote journey and production observability are stable.

## Sprint 7 design constraint
Reuse Sprint 4 customer identity and linking invariants. Prefer explicit operator action over automatic identity merging. Matching an email/phone may be used to suggest an existing customer, but must not silently merge two customers or overwrite contact data.
