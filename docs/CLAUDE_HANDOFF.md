# Claude Handoff — Current State

## Goal
Begin implementation only after repository context is read. The architecture phase has reached Technical Architecture v0.4 and Sprint 0 is defined.

## Read first
- `CLAUDE.md`
- `AGENTS.md`
- `docs/PROJECT_STATE.md`
- `docs/PRODUCT_VISION.md`
- `docs/DECISIONS.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_MODEL.md`
- `docs/DOMAIN_RULES.md`
- `docs/AI_PRODUCT_CONFIGURATOR.md`
- `docs/IMPLEMENTATION_SPRINT_0.md`
- `docs/CLAUDE_WORKFLOW.md`

## Current status
No broad application code should be assumed complete. Repository documentation is now the canonical shared context.

## Recommended next action
Use `docs/CLAUDE_SPRINT0_PROMPT.md` and execute Sprint 0 on a feature branch.

## Important future constraints
- Do not block the AI Product Configurator path.
- Do not block multi-organization/partner-network expansion.
- Do not prematurely implement those later phases either.
- Preserve audit/version/history semantics.
- Preserve organization isolation.
- Keep AI provider-specific code behind the AI Gateway boundary.
