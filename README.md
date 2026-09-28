# Avitus Materia OS

**AI-native Operating & Sales System for custom manufacturing.**

Avitus Materia OS is the central operating-and-sales platform being built for **Avitus Materia** (`Avitus-Materia.com`). The first implementation serves Avitus Materia; the architecture preserves a path toward partner organizations, distributed manufacturing, international expansion and future SaaS/network models.

## Core flow

`MARKET -> CONTENT -> LEAD -> CUSTOMER -> CONFIGURATION -> QUOTE -> ORDER -> PROJECT -> MATERIAL -> PRODUCTION -> DELIVERY -> FINANCE -> RELATIONSHIP -> DATA -> AUTOMATION -> AI`

## Architecture direction

- monorepo
- modular monolith first
- TypeScript / Node.js LTS
- Next.js customer/admin surfaces
- NestJS backend
- PostgreSQL
- API-first, event-aware
- single-company UX first; multi-organization-ready domain
- AI acts through controlled tools/policies, not arbitrary database access

## Project documentation

Start here:

1. [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — current checkpoint and next steps
2. [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md) — product direction
3. [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md) — core domains and entities
4. [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — data model principles and entities
5. [`docs/DOMAIN_RULES.md`](docs/DOMAIN_RULES.md) — state machines and business rules
6. [`docs/TECHNICAL_ARCHITECTURE.md`](docs/TECHNICAL_ARCHITECTURE.md) — technical architecture v0.4
7. [`docs/AI_PRODUCT_CONFIGURATOR.md`](docs/AI_PRODUCT_CONFIGURATOR.md) — customer AI configurator specification
8. [`docs/REPOSITORY_STRUCTURE.md`](docs/REPOSITORY_STRUCTURE.md) — target repository structure
9. [`docs/ROADMAP.md`](docs/ROADMAP.md) — phased roadmap
10. [`docs/DECISIONS.md`](docs/DECISIONS.md) — architecture/product decision log
11. [`docs/BOOTSTRAP_CHECKPOINT_0.md`](docs/BOOTSTRAP_CHECKPOINT_0.md) — context-loss protection checkpoint

## Implementation handoff

- [`docs/IMPLEMENTATION_SPRINT_0.md`](docs/IMPLEMENTATION_SPRINT_0.md) — first implementation scope and acceptance criteria
- [`docs/CLAUDE_SPRINT0_PROMPT.md`](docs/CLAUDE_SPRINT0_PROMPT.md) — ready-to-use Claude implementation prompt
- [`docs/CLAUDE_WORKFLOW.md`](docs/CLAUDE_WORKFLOW.md) — Claude/GitHub working protocol
- [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) — current-state handoff

## AI engineering instructions

- [`CLAUDE.md`](CLAUDE.md) — primary instructions for Claude
- [`AGENTS.md`](AGENTS.md) — Claude/GPT/Codex collaboration protocol

## Fundamental principle

**DATA TRUTH -> AUTOMATION -> INTELLIGENCE**

Reliable business truth and domain rules come first. Automation is built on that foundation. Autonomous AI comes only after both are trustworthy.

## Status

Sprints 0–9 are merged; the sales API includes accepted Quote → Order + Project. Production operator identity and the physical production/delivery/actual-cost loop are incomplete. See [current state](docs/PROJECT_STATE.md) and the [2026-09-28 system baseline](docs/SYSTEM_RECONCILIATION_2026-09-28.md). Deployment is not proof of a usable authenticated end-to-end journey.
