# AGENTS.md — Multi-AI Collaboration Protocol

## Purpose
This repository is designed for cooperative work between Claude, GPT/Codex and future engineering agents. GitHub is the durable shared memory.

## Roles
### Claude
Primary implementation engineer: coding, refactoring, tests, migrations, local/repository execution.

### GPT / Codex
Architecture, domain modeling, implementation support, code review, specification, risk analysis, second-opinion engineering.

### Human owners
Final authority for business priorities, irreversible actions, legal/financial policy and strategic product direction.

## Shared rules
1. Read repository documentation before making structural changes.
2. Do not rely on chat memory as the sole source of project truth.
3. Record accepted architecture and major decisions in repository docs.
4. Separate facts/accepted decisions from assumptions and proposals.
5. Prefer reversible, incremental changes.
6. Never silently rewrite another agent's architectural decision.
7. Flag contradictions between docs and code.
8. Never expose secrets or personal production data in prompts, commits or logs.
9. Keep commits focused and explain intent.
10. Use branches/PR review for substantial implementation once active development begins.

## Coordination
Claims, reservations (migration numbers, decision IDs, sprint numbers) and known collisions: `docs/WORK_BOARD.md`. Rules and communication channels: `docs/COORDINATION.md`.

## Handoff format
When one agent hands work to another, include:
- Goal
- Current state
- Files changed
- Decisions made
- Assumptions
- Open questions
- Tests/checks performed
- Recommended next action

## Decision hierarchy
1. Explicit human-approved decisions
2. `docs/DECISIONS.md`
3. Current architecture/product documentation
4. Existing code/contracts
5. Agent proposal

If there is a conflict, stop and surface it.

## Review protocol
A reviewing agent should check:
- domain correctness
- module boundaries
- data integrity and migrations
- authorization / tenant isolation
- audit/event requirements
- AI policy boundaries
- idempotency
- tests
- performance only where material
- unnecessary complexity

## Anti-patterns
- Microservices before operational need
- AI writing arbitrary SQL to production
- Business state represented only by UI flags
- Overwriting accepted quotes/configurations
- Shared mutable data without organization scoping
- Hidden cross-module database dependencies
- Premature infrastructure complexity
- Large refactors without a recorded reason
