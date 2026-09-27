# Coordination Protocol — how agents and humans avoid collisions

**Status:** Accepted (DD-023)
**Applies to:** Claude (any session), GPT/Codex, future agents, human contributors.

`AGENTS.md` defines *roles* and the *handoff format*. This document defines the **communication
channels** and the **collision-prevention rules** that make parallel work safe.

## Why this exists
On 2026-09-26 two lines of work were both labelled "Sprint 3" and developed in parallel from the
Sprint 2 base:

| Line | Branch | Result |
|---|---|---|
| Public website + inquiry intake | `sprint-3/public-web-v0.1` (PR #4) | merged to `main` |
| Customer identity | `sprint-3/customer-identity` (PR #5) | open, 11 commits behind `main` |

They collided on four shared sequential identifiers:
1. migration `0003_*` (`0003_public_inquiry.sql` vs `0003_customer_identity.sql`),
2. decision `DD-022` (Fly.io platform vs customer identity),
3. sprint number / `docs/IMPLEMENTATION_SPRINT_3.md` (two different documents),
4. composition-root files (`apps/api/src/app.module.ts`, `tokens.ts`, `pnpm-lock.yaml`).

Nothing in the repository told either agent that the other one existed. This protocol closes that gap.

## Channels (where each kind of message lives)

| Message | Channel | Durable? |
|---|---|---|
| "I am working on X, on branch Y, touching Z" (claim) | `docs/WORK_BOARD.md` → *Active lanes* | yes |
| Reserved migration number / DD ID / sprint number | `docs/WORK_BOARD.md` → *Reservations* | yes |
| Accepted architecture/product decision | `docs/DECISIONS.md` | yes |
| Current validated system state | `docs/PROJECT_STATE.md` | yes |
| What the next agent should pick up | `docs/NEXT_ACTION.md` | yes |
| Handoff after a work session | PR description (AGENTS.md format) + board update | yes |
| Review findings, questions to another agent | PR review comments | yes |
| Question requiring a human decision | GitHub Issue labelled `decision-needed` (or PR comment mentioning the owner) | yes |
| Brainstorming, drafts | chat | **no** — must be written back to the repo if it matters |

Rule: **if it is not on GitHub, the other agent cannot see it.** Chat is working memory only.

## Collision-prevention rules

### R1 — Claim before you code
Before the first commit of a substantial task, add a row to *Active lanes* in `docs/WORK_BOARD.md`
(on `main` via a tiny docs commit/PR, or as the first commit of your branch if you cannot write to
`main`). A claim states: lane, owner (agent/session), branch, PR, modules/files touched, status.
Before starting, read the board — if another lane already touches the same module or composition
file, coordinate first (sequence the work or split the file ownership).

### R2 — Reserve shared sequential identifiers
Migration numbers, `DD-NNN` decision IDs and sprint numbers are global. Take the next free value from
*Reservations* and write your reservation there **in the same commit as the claim**. Never pick
"max + 1" by looking only at your own branch.

`pnpm lint` runs `scripts/verify-coordination.mjs`, which fails CI on duplicate migration prefixes
and duplicate `DD-NNN` headings. It is a safety net, not a substitute for reserving.

### R3 — Branch from current `main`, stay close to it
Start every lane from the latest `main`. When `main` moves, merge `main` into your branch (no
history rewriting on branches other agents may have checked out). A branch more than a few merges
behind must be refreshed before review.

### R4 — Composition roots are shared territory
`apps/api/src/app.module.ts`, `apps/api/src/tokens.ts`, `packages/database/src/index.ts`,
`packages/database/src/seed-dev.ts`, `pnpm-lock.yaml`, `turbo.json` and CI workflows are touched by
almost every lane. Keep edits there minimal and append-only where possible; list them in your claim.
Regenerate `pnpm-lock.yaml` with `pnpm install`, never by hand.

### R5 — One number, one meaning
Sprint documents are named `IMPLEMENTATION_SPRINT_<N>.md` where `<N>` is reserved on the board.
If two lanes need to run in parallel, they get **different** numbers (or explicit suffixes
`4a`/`4b` reserved on the board) — never the same one.

### R6 — Release the claim
On merge/close, move the lane to *Recently closed* with the outcome and update
`docs/PROJECT_STATE.md` / `docs/NEXT_ACTION.md` when state materially changed.

### R7 — Never silently fix another lane
If you find a collision in someone else's open lane, do not push to their branch without the
owner's/human's approval. Record it on the board under *Known collisions* with a proposed
resolution (AGENTS.md: "never silently rewrite another agent's architectural decision").

## Session start checklist (every agent)
1. `git fetch` and read `docs/WORK_BOARD.md` on `origin/main`.
2. Check open PRs (`Active lanes` may be stale — PRs are the tie-breaker).
3. Read the docs required by `CLAUDE.md`.
4. Claim + reserve (R1, R2).
5. Work; merge `main` in when it moves (R3).
6. Before handoff: `pnpm lint && pnpm typecheck && pnpm test`, update PR description in the
   AGENTS.md handoff format, update the board (R6).
