# Work Board — active lanes, reservations, collisions

Protocol: `docs/COORDINATION.md`. Update this file whenever you start, hand off or finish a lane.
PRs on GitHub are the tie-breaker if this board is stale.

_Last updated: 2026-09-26_

## Active lanes

| Lane | Owner | Branch | PR | Touches | Status |
|---|---|---|---|---|---|
| Customer identity (Person/Company/CustomerAccount/ContactPoint + sales links) | Claude (earlier session) | `sprint-3/customer-identity` | #5 | new `modules/customers`; migration; `apps/api` composition root; `apps/admin`; `packages/database`; DECISIONS | **Blocked by collision** — see C-001..C-003 |
| Coordination protocol + collision guard | Claude (session `ht9hxm`) | `claude/avitus-msteria-project-ht9hxm` | — | `docs/COORDINATION.md`, `docs/WORK_BOARD.md`, `scripts/verify-coordination.mjs`, `package.json` lint script, PR template, handoff docs | In review |
| Production deployment v0.1 (Fly.io + home.pl DNS) | Human owner | — (scripts merged to `main`) | — | infra only, `scripts/fly-*`, secrets outside repo | Waiting on owner actions (`docs/FLY_DEPLOYMENT_USER_CHECKLIST.md`) |

## Reservations

Take the next free value, write your lane next to it, commit together with your claim.

### Migration numbers (`packages/database/migrations/NNNN_*.sql`)
| Number | Lane | State |
|---|---|---|
| 0000 | Sprint 0 foundation | merged |
| 0001 | Sprint 1 sales foundation | merged |
| 0002 | Sprint 2 pricing/quotes | merged |
| 0003 | Sprint 3 public inquiry | merged |
| **0004** | Customer identity (PR #5) — must rename from `0003_customer_identity.sql` | reserved |
| 0005 | _next free_ | — |

### Decision IDs (`docs/DECISIONS.md`)
| ID | Subject | State |
|---|---|---|
| DD-022 | Production deployment platform (Fly.io) | merged |
| DD-023 | Coordination protocol and shared-identifier reservations | this lane |
| **DD-024** | Customer identity precedes Quote READY/SENT governance (PR #5 — renumber from DD-022) | reserved |
| DD-025 | _next free_ | — |

### Sprint numbers
| Sprint | Subject | State |
|---|---|---|
| 0 | Core foundation + Lead | merged |
| 1 | Opportunity, Catalog, Configuration | merged |
| 2 | Pricing + immutable draft quotes | merged |
| 3 | Public website v0.1 + inquiry intake | merged |
| **4** | Customer identity (PR #5 — rename doc to `IMPLEMENTATION_SPRINT_4.md`) | reserved |
| 5 | _next free_ (candidate: guided public configurator or Quote governance — human decision) | — |

## Known collisions

### C-001 — Duplicate migration `0003` (PR #5 vs `main`)
`main` has `0003_public_inquiry.sql` (already applied wherever v0.1 was migrated). PR #5 adds
`0003_customer_identity.sql`. The migrator sorts by filename and tracks by filename, so the
apply order would differ between fresh and existing databases.
**Resolution:** rename to `0004_customer_identity.sql` after merging `main` into the branch; verify
it has no dependency on objects created only later. `pnpm lint` now fails on this collision.

### C-002 — Duplicate `DD-022`
`main`: DD-022 = Fly.io platform. PR #5: DD-022 = customer identity precedes Quote governance.
**Resolution:** renumber the PR #5 entry to **DD-024**.

### C-003 — Two different "Sprint 3" documents
Both lanes wrote `docs/IMPLEMENTATION_SPRINT_3.md`.
**Resolution:** keep `main`'s file; move PR #5's content to `docs/IMPLEMENTATION_SPRINT_4.md`
and update its title ("Implementation Sprint 4 — Customer identity").

### C-004 — Composition-root / lockfile drift
PR #5 is based on Sprint 2 and edits `apps/api/src/app.module.ts`, `apps/api/src/tokens.ts`,
`packages/database/src/index.ts`, `seed-dev.ts`, `apps/admin/src/app/page.tsx`, `pnpm-lock.yaml`,
all of which Sprint 3 also changed.
**Resolution:** merge `main` into the branch (no rebase/force-push), resolve by keeping both
registrations, regenerate the lockfile with `pnpm install`, then run the full CI locally.

Owner approval needed before anyone pushes these fixes to `sprint-3/customer-identity` (R7).

## Recently closed
| Lane | PR | Outcome |
|---|---|---|
| Sprint 0–3, design refinement, Fly deployment helpers | #1–#4, #6–#10 | changes landed on `main` (PRs closed after direct integration) |
