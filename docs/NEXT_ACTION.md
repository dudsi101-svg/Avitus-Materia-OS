# Next Action

_Updated 2026-09-28. Sprints 0–5 (incl. 5b) are merged. Live coordination state: `docs/WORK_BOARD.md`._

## For any agent starting a session
Follow the session start checklist in `docs/COORDINATION.md` before coding.

## Queue (in order)
1. **Unblock production deploys (owner only)** — replace GitHub secret `FLY_API_TOKEN` with an org token covering
   both Fly apps (`docs/DEPLOYMENT_BLOCKER_FLY_TOKEN.md`). Website v0.4 and Sprints 4–5 are waiting on it. Agents cannot do this: it needs the owner's Fly login.
2. **Next candidates:** admin view to convert configuration requests into Opportunity + Configuration;
   owner-approved price rules for an indicative price; Quote governance (VAT/discounts/READY/SENT).
3. Then follow "Next engineering sequence" in `docs/PROJECT_STATE.md`.
