# Claude Handoff — Current State

_Updated 2026-09-26._

## Goal
Continue Avitus Materia OS after Sprints 0–3 without colliding with parallel lanes.

## Current state
- `main`: Sprints 0–3 merged (foundation, sales/configuration, pricing/draft quotes, public website + inquiry intake) and Fly.io v0.1 deployment tooling.
- Open PR #5 (customer identity) collides with `main`; see `docs/WORK_BOARD.md` C-001..C-004.

## Read first
`CLAUDE.md` required-reading list, then `docs/WORK_BOARD.md` and `docs/COORDINATION.md`.

## Recommended next action
See `docs/NEXT_ACTION.md`.

## Important constraints
- Claim work and reserve migration/decision/sprint numbers before coding (DD-023).
- Do not block the AI Product Configurator path or partner-network expansion.
- Preserve audit/version/history semantics and organization isolation.
- Keep AI provider-specific code behind the AI Gateway boundary.
