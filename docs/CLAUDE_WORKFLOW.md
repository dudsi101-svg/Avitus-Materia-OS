# Claude <-> GitHub Working Instructions

## Purpose
This document explains how Claude should operate on Avitus Materia OS through GitHub without losing shared context or bypassing review.

## Start of every substantial task
1. Open the repository.
2. Read `CLAUDE.md` and `AGENTS.md`.
3. Read `docs/PROJECT_STATE.md` and relevant domain/architecture docs.
4. Inspect current code and open PRs/issues relevant to the task.
5. Summarize current state before implementing.

## Branching
For substantial code changes use a descriptive branch:
- `feat/...`
- `fix/...`
- `refactor/...`
- `docs/...`

Examples:
- `feat/sprint-0-foundation`
- `feat/configurator-session`
- `fix/organization-scope`

Avoid developing large changes directly on `main` once implementation begins.

## Commits
Commits should be focused and intention-revealing, e.g.:
- `chore: bootstrap monorepo tooling`
- `feat(iam): add organization request context`
- `feat(crm): add organization-scoped lead creation`
- `test(crm): verify cross-organization isolation`

Do not mix unrelated refactors into a feature commit.

## Pull requests
A substantial PR should contain:
- problem/goal
- implementation summary
- architectural impact
- migrations
- security/tenant impact
- tests executed
- screenshots for UI where useful
- known limitations
- documentation updated

## Human approval boundaries
Stop and ask before:
- changing accepted product/architecture direction
- destructive database migration
- deleting large areas of code/docs
- changing production infrastructure/provider
- adding credentials/secrets
- enabling external paid services with meaningful cost
- changing legal/privacy policy
- merging high-risk code if review is expected

## GPT/Codex collaboration
When a second-opinion review is needed, provide GPT/Codex:
- PR or branch
- exact goal
- architecture docs
- migration/data model impact
- test results
- disputed decision if any

Do not ask another agent to review only a pasted fragment when repository context materially changes the answer.

## Project-memory discipline
After material progress update:
- `docs/PROJECT_STATE.md`
- `docs/DECISIONS.md` if architecture changed
- module/spec documentation if behavior changed

GitHub is the durable memory. Chats are working memory.

## Failure protocol
If blocked:
1. do not improvise around security/business constraints
2. document exact failing command/error
3. identify whether block is code, permissions, credential, environment or product decision
4. propose the smallest safe next action

## Completion protocol
Before handoff:
- check git status/diff
- run lint/typecheck/tests/build appropriate to task
- ensure migrations are committed
- ensure no secrets/real PII were added
- summarize deviations from plan
- open/update PR when applicable
