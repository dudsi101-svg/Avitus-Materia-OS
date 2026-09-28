# Work Board — active lanes, reservations, collisions

Protocol: `docs/COORDINATION.md`. Update this file whenever you start, hand off or finish a lane.
PRs on GitHub are the tie-breaker if this board is stale.

_Last updated: 2026-09-28_

## Active lanes

| Lane | Owner | Branch | PR | Touches | Status |
|---|---|---|---|---|---|
| Sprint 6 — Convert configurator requests into Opportunity + Configuration (Command Center) | Claude (session `ht9hxm`) | `claude/avitus-msteria-project-ht9hxm` | — | `modules/acquisition`, `modules/crm` + `modules/configurator` (exported builders only), migration 0007, `packages/database` (schema, seed permissions), `apps/api` controller + composition root, `apps/admin` | In review |

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
| **0005** | Sprint 5 public configuration requests | merged |
| **0006** | Sprint 5b option presentation metadata | merged |
| **0007** | Sprint 6 configuration request conversions | reserved |
| 0008 | _next free_ | — |

### Decision IDs (`docs/DECISIONS.md`)
| ID | Subject | State |
|---|---|---|
| DD-022 | Production deployment platform (Fly.io) | merged |
| DD-023 | Coordination protocol and shared-identifier reservations | merged |
| DD-024 | Customer identity precedes Quote READY/SENT governance | merged |
| **DD-025** | Public configurator requests: immutable intake snapshot, no auto-Opportunity, no public price | merged |
| **DD-026** | Option presentation lives in the catalog, not in UI code | merged |
| **DD-027** | Conversion of public configuration requests is explicit, atomic and one-time | reserved |
| DD-028 | _next free_ | — |

### Sprint numbers
| Sprint | Subject | State |
|---|---|---|
| 0 | Core foundation + Lead | merged |
| 1 | Opportunity, Catalog, Configuration | merged |
| 2 | Pricing + immutable draft quotes | merged |
| 3 | Public website v0.1 + inquiry intake | merged |
| 4 | Customer identity | merged |
| 5 | Public configurator v1 + 5b | merged |
| **6** | Configuration request → Opportunity + Configuration (owner chose 2026-09-28) | reserved |
| 7 | _next free_ (candidate: Quote governance) | — |

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
| Sprint 5 / 5b public configurator + extensible options | #18 | merged 2026-09-28 |
| Sideboard catalog defaults | #19 | merged 2026-09-28 |
| Deploy target detection per app | #20 | merged 2026-09-28 |
| Production deploy unblocked (new Fly org token) | — | web + API deployed 2026-09-28 |
| API dual-stack bind (INC-001), production deploy gate, website v0.4, path-aware Fly deploy | #12–#16 | landed on `main` |
