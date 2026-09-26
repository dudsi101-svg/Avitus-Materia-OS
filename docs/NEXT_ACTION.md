# Next Action

_Updated 2026-09-26. Sprints 0–3 are merged. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Queue (in order)
1. **Resolve PR #5 collisions (customer identity)** — needs owner approval to push to
   `sprint-3/customer-identity`. Merge `main` in, rename migration to `0004_customer_identity.sql`,
   renumber decision to DD-024, move sprint doc to `IMPLEMENTATION_SPRINT_4.md`, regenerate lockfile,
   run full CI. Details: `docs/WORK_BOARD.md` C-001..C-004.
2. **Production v0.1** — owner steps in `docs/FLY_DEPLOYMENT_USER_CHECKLIST.md` (Fly secrets,
   Managed Postgres, home.pl DNS, smoke test inquiry -> Lead).
3. **Human decision:** Sprint 5 = guided public Product Configurator *or* Quote governance
   (VAT/discount approvals/READY/SENT). Quote governance depends on customer identity (DD-024).
4. Then follow "Next engineering sequence" in `docs/PROJECT_STATE.md`.
