# Next Action

_Updated 2026-09-27. Sprints 0–4 are merged; Sprint 5 in review. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Queue (in order)
1. **Review/merge Sprint 5 public configurator** (branch `claude/avitus-msteria-project-ht9hxm`).
2. **Unblock production deploys** — replace GitHub secret `FLY_API_TOKEN` with an org token covering
   both Fly apps (`docs/DEPLOYMENT_BLOCKER_FLY_TOKEN.md`). Website v0.4, Sprint 4 and Sprint 5 are waiting on it.
3. **Next candidates:** admin view to convert configuration requests into Opportunity + Configuration;
   owner-approved price rules for an indicative price; Quote governance (VAT/discounts/READY/SENT).
4. Then follow "Next engineering sequence" in `docs/PROJECT_STATE.md`.
