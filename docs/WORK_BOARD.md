# Work Board — active lanes, reservations, collisions

Protocol: `docs/COORDINATION.md`. Update this file whenever you start, hand off or finish a lane.
PRs on GitHub are the tie-breaker if this board is stale.

_Last updated: 2026-09-27 (Sprint 5 claimed)_

## Active lanes

| Lane | Owner | Branch | PR | Touches | Status |
|---|---|---|---|---|---|
| Sprint 5 / 5b — Public configurator v1 + extensible options (presentation metadata, new options, share link) | Claude (session `ht9hxm`) | `claude/avitus-msteria-project-ht9hxm` | #18 | `modules/acquisition`, `modules/catalog` (read), migrations 0005–0006, `packages/database` (schema, seed-dev, bootstrap-prod starter catalog), new `apps/api` public controller, `apps/api` composition root, `apps/web/src/app/kreator` + new components/route | In review |
| Production deployment (Fly.io + home.pl DNS) | Human owner | — | — | GitHub secret `FLY_API_TOKEN` | Blocked: Fly returns `unauthorized` for the current token (run 25, 2026-09-27); owner must replace it with an org token covering both apps |

## Reservations

Take the next free value, write your lane next to it, commit together with your claim.

### Migration numbers (`packages/database/migrations/NNNN_*.sql`)
| Number | Lane | State |
|---|---|---|
| 0000 | Sprint 0 foundation | merged |
| 0001 | Sprint 1 sales foundation | merged |
| 0002 | Sprint 2 pricing/quotes | merged |
| 0003 | Sprint 3 public inquiry | merged |
| 0004 | Sprint 4 customer identity | merged |
| **0005** | Sprint 5 public configuration requests | in review (#18) |
| **0006** | Sprint 5b option presentation metadata | in review (#18) |
| 0007 | _next free_ | — |

### Decision IDs (`docs/DECISIONS.md`)
| ID | Subject | State |
|---|---|---|
| DD-022 | Production deployment platform (Fly.io) | merged |
| DD-023 | Coordination protocol and shared-identifier reservations | merged |
| DD-024 | Customer identity precedes Quote READY/SENT governance | merged |
| **DD-025** | Public configurator requests: immutable intake snapshot, no auto-Opportunity, no public price | in review (#18) |
| **DD-026** | Option presentation lives in the catalog, not in UI code | in review (#18) |
| DD-027 | _next free_ | — |

### Sprint numbers
| Sprint | Subject | State |
|---|---|---|
| 0 | Core foundation + Lead | merged |
| 1 | Opportunity, Catalog, Configuration | merged |
| 2 | Pricing + immutable draft quotes | merged |
| 3 | Public website v0.1 + inquiry intake | merged |
| 4 | Customer identity | merged |
| **5** | Public configurator v1 (owner chose option A on 2026-09-27) | reserved |
| 6 | _next free_ (candidate: Quote governance) | — |

## Known collisions

### C-001 — Duplicate migration `0003` (PR #5 vs `main`) — **resolved in Sprint 4 lane**
`main` has `0003_public_inquiry.sql` (already applied wherever v0.1 was migrated). PR #5 adds
`0003_customer_identity.sql`. The migrator sorts by filename and tracks by filename, so the
apply order would differ between fresh and existing databases.
**Resolution:** rename to `0004_customer_identity.sql` after merging `main` into the branch; verify
it has no dependency on objects created only later. `pnpm lint` now fails on this collision.

### C-002 — Duplicate `DD-022` — **resolved in Sprint 4 lane**
`main`: DD-022 = Fly.io platform. PR #5: DD-022 = customer identity precedes Quote governance.
**Resolution:** renumber the PR #5 entry to **DD-024**.

### C-003 — Two different "Sprint 3" documents — **resolved in Sprint 4 lane**
Both lanes wrote `docs/IMPLEMENTATION_SPRINT_3.md`.
**Resolution:** keep `main`'s file; move PR #5's content to `docs/IMPLEMENTATION_SPRINT_4.md`
and update its title ("Implementation Sprint 4 — Customer identity").

### C-004 — Composition-root / lockfile drift — **resolved in Sprint 4 lane**
PR #5 is based on Sprint 2 and edits `apps/api/src/app.module.ts`, `apps/api/src/tokens.ts`,
`packages/database/src/index.ts`, `seed-dev.ts`, `apps/admin/src/app/page.tsx`, `pnpm-lock.yaml`,
all of which Sprint 3 also changed.
**Resolution:** merge `main` into the branch (no rebase/force-push), resolve by keeping both
registrations, regenerate the lockfile with `pnpm install`, then run the full CI locally.

Resolved by rebuilding the lane on current `main` in a new PR (owner approved autonomous execution 2026-09-27). PR #5 is closed only after the replacement PR is green.

## Recently closed
| Lane | PR | Outcome |
|---|---|---|
| Sprint 0–3, design refinement, Fly deployment helpers | #1–#4, #6–#10 | changes landed on `main` (PRs closed after direct integration) |
| Coordination protocol + collision guard (DD-023) | #11 | landed on `main` |
| Sprint 4 customer identity (replaced #5) | #17 | merged |
| API dual-stack bind (INC-001), production deploy gate, website v0.4, path-aware Fly deploy | #12–#16 | landed on `main` |
