# Next Action

_Updated 2026-09-26. Sprints 0–3 are merged. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Queue (in order)
1. **Merge Sprint 4 customer identity** — rebuilt on current `main` (migration 0004, DD-024,
   `IMPLEMENTATION_SPRINT_4.md`), branch `claude/avitus-msteria-project-ht9hxm`. Close PR #5 after
   the replacement PR is green.
2. **Production v0.1** — owner steps in `docs/FLY_DEPLOYMENT_USER_CHECKLIST.md` (Fly secrets,
   Managed Postgres, home.pl DNS, smoke test inquiry -> Lead).
3. **Human decision:** Sprint 5 = guided public Product Configurator *or* Quote governance
   (VAT/discount approvals/READY/SENT). Quote governance depends on customer identity (DD-024).
4. Then follow "Next engineering sequence" in `docs/PROJECT_STATE.md`.
