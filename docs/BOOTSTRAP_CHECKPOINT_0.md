# Bootstrap Checkpoint 0 — Summary

This checkpoint exists to prevent loss of architectural context from long AI conversations.

## What is now durable in GitHub
- product identity and legacy/rebrand rule
- product vision
- core domain model
- consolidated data model
- domain rules and state-machine direction
- technical architecture v0.4
- AI Product Configurator specification
- target repository structure
- roadmap
- decision log
- Claude implementation instructions
- Claude/GPT collaboration protocol
- Sprint 0 scope and reusable Claude prompt

## Rebrand rule
The system and brand are **Avitus Materia / Avitus Materia OS**. Historical Drakkar data is legacy migration input, not new core terminology.

## Primary architecture decisions
- monorepo
- modular monolith initially
- TypeScript/Node LTS primary stack
- Next.js customer/admin web surfaces
- NestJS API/backend
- PostgreSQL
- API-first, event-aware/outbox-ready
- strong module boundaries
- organization-scoped domain from day one
- AI actions through controlled tools/policies

## Strategic expansion protected by the architecture
1. premium customer AI Product Configurator
2. room-photo analysis and arrangement visualization
3. historical-intelligence-assisted pricing/decision support
4. customer portal and lifecycle continuity
5. material digital twin and production orchestration
6. partner/subcontractor collaboration network
7. distributed manufacturing
8. eventual platform/SaaS/marketplace only if commercially justified

## Current milestone
Architecture/pre-implementation is sufficiently defined to begin **Implementation Sprint 0**.

The first engineering proof is intentionally narrow:
`Authenticated user -> Organization context -> create/read Lead -> AuditEvent + LeadCreated DomainEvent -> Admin UI`.

## Rule for future AI sessions
Do not reconstruct the project from chat history if the repository is available. Read repository docs first, then use chat only for new decisions/work.
