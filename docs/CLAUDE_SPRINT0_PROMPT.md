# Claude Prompt — Avitus Materia OS Sprint 0

Use this prompt when starting Claude on the repository.

---

You are the primary implementation engineer for **Avitus Materia OS** in GitHub repository:

`dudsi101-svg/Avitus-Materia-OS`

Your task is to execute **Implementation Sprint 0** carefully and incrementally.

## First: do not code immediately

Read these files in order:
1. `CLAUDE.md`
2. `AGENTS.md`
3. `docs/PROJECT_STATE.md`
4. `docs/PRODUCT_VISION.md`
5. `docs/DECISIONS.md`
6. `docs/TECHNICAL_ARCHITECTURE.md`
7. `docs/DOMAIN_MODEL.md`
8. `docs/DATA_MODEL.md`
9. `docs/DOMAIN_RULES.md`
10. `docs/IMPLEMENTATION_SPRINT_0.md`

Then inspect the current repository state.

## Before changing files, produce a short implementation plan
Include:
- proposed repository tree for Sprint 0 only
- chosen concrete packages/libraries consistent with `TECHNICAL_ARCHITECTURE.md`
- database/migration approach
- authentication approach for development vs production boundary
- how organization isolation will be enforced and tested
- how AuditEvent and LeadCreated DomainEvent will be persisted
- CI plan
- risks/assumptions

If you find a contradiction in the documentation, stop and identify it rather than silently choosing a new architecture.

## Implementation target
Build the smallest production-quality vertical slice:

`Authenticated user -> Organization context -> create/read Lead -> AuditEvent + LeadCreated DomainEvent -> minimal Admin UI`

Follow `docs/IMPLEMENTATION_SPRINT_0.md` as the acceptance contract.

## Repository discipline
- Do not redesign the product architecture.
- Do not introduce microservices, Kubernetes, Redis, GraphQL, vector DB or AI agents in Sprint 0 unless the documented architecture genuinely requires them (it currently does not).
- Do not scaffold empty future apps/modules just because they appear in target architecture.
- Do not commit secrets, tokens or real customer data.
- Use migrations only for schema changes.
- Keep module write boundaries explicit.
- Enforce `organization_id`/organization scope at repository/application/API layers where appropriate.
- Add a mandatory test proving org A cannot access org B's Lead.

## Git workflow
Prefer working on a branch such as:

`feat/sprint-0-foundation`

Make focused commits with clear messages. If your environment supports Pull Requests, finish with a PR into `main` rather than a large unreviewed direct commit.

Do not force-push, rewrite repository history or delete existing architecture documentation.

## Quality gates
Before declaring success run the relevant:
- install with lockfile
- lint
- typecheck
- unit tests
- integration/API tests
- build

Run an end-to-end happy path if reasonably supported by the chosen setup.

## Documentation updates
At the end:
- update `docs/PROJECT_STATE.md`
- add any genuinely new architecture decision to `docs/DECISIONS.md`
- add local setup/run/test commands to README or a dedicated development guide

## Final handoff format
Return:
1. What was implemented
2. Repository structure created
3. Files changed
4. Migrations/schema created
5. Tests and exact results
6. CI status
7. Decisions made
8. Assumptions/limitations
9. Security/tenant-isolation checks
10. Recommended next slice

Do not claim completion if tests/build are failing. If blocked by credentials or a human-only action, stop at that boundary and state exactly what is needed.

---
