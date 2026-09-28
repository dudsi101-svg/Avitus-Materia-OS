# Next Action

_Updated 2026-09-28. Sprints 0–8 are merged. Main CI #113 and Fly production deploy run 55 for Sprint 8 completed successfully; API readiness verification passed. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Current verified position
- website v0.4 is the current public brand surface;
- `/kreator` is live and catalog-driven;
- public configuration requests create immutable intake + Lead;
- Sprint 6 converts a request exactly once into Opportunity + Configuration v1;
- Sprint 7 explicitly establishes CustomerAccount identity and consistent Lead/Opportunity links;
- Sprint 8 creates governed QuoteVersions with buyer snapshot, explicit tax/discount terms, actual post-discount margin, human discount approval, and controlled `DRAFT -> READY -> SENT` transitions;
- migration `0008` deployed successfully in Fly production run 55 and API `/ready` passed;
- internal Command Center controls exist in repo, but the admin surface is not yet separately verified as a production-deployed/authenticated operator application.

## Queue (in order)
1. **Sprint 9 — Accepted Quote -> Order + Project:** introduce explicit quote acceptance, then atomically create one commercial `Order` from the accepted QuoteVersion and a separate operational `Project` linked to that Order.
2. **Production operator surface/auth:** expose the internal Command Center through a real production-authenticated surface before claiming browser-level production smoke of the full sales journey.
3. **BusinessCalendar + capacity/availability truth:** only after Project exists, build operational scheduling truth before promising delivery dates.
4. **Material + production execution:** Order/Project -> material requirements/reservations -> production workflow/jobs/operations -> QA -> delivery/install.
5. **Outbox publisher + observability:** turn persisted events into reliable integration delivery and improve production diagnostics.
6. **AI/visualization:** layer advisor/operator capabilities on the now-governed commercial and operational tools.

## Sprint 9 constraints
- only an explicitly `ACCEPTED` governed Quote can create an Order;
- the accepted `QuoteVersion` is immutable commercial source of truth for the Order;
- conversion is one-time and concurrency-safe;
- `Order` is the commercial commitment; `Project` is separate operational execution (DD-018);
- Order must snapshot the accepted totals/currency/buyer reference needed to explain the commitment without recomputing history;
- Project may reference the Order/configuration but must not mutate the accepted Quote;
- no invented promised date until BusinessCalendar/capacity exists;
- acceptance, Order creation and Project creation require audit + domain events and tenant isolation.
