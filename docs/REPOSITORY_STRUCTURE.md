# Avitus Materia OS — Repository Structure v0.1

## Decision
Use a **monorepo** with a **modular monolith** backend and separate application surfaces where justified.

Target direction:

```text
Avitus-Materia-OS/
├── apps/
│   ├── admin/
│   ├── customer-portal/
│   ├── configurator/
│   ├── production/
│   ├── partner-portal/
│   └── api/
│
├── modules/
│   ├── iam/
│   ├── crm/
│   ├── catalog/
│   ├── configurator/
│   ├── pricing/
│   ├── quotes/
│   ├── orders/
│   ├── projects/
│   ├── inventory/
│   ├── purchasing/
│   ├── production/
│   ├── logistics/
│   ├── finance/
│   ├── communications/
│   ├── automations/
│   ├── intelligence/
│   ├── visualizations/
│   ├── scheduling/
│   └── partners/
│
├── packages/
│   ├── ui/
│   ├── shared/
│   ├── database/
│   ├── config/
│   ├── ai-sdk/
│   └── design-system/
│
├── docs/
├── infra/
└── tests/
```

## Important
This is a target map, not an instruction to scaffold every directory immediately.

Sprint 0 should create only the pieces necessary for the first coherent vertical slice. Empty architecture theater is discouraged.

## Apps
### admin
Internal management interface: command center, sales, pricing, orders, projects, operations and administration.

### customer-portal
Authenticated customer continuity: saved designs, quotes, approvals, payments, progress, delivery and service.

### configurator
Public/guest-friendly AI Product Configurator optimized for acquisition and conversion. May initially share runtime/deployment with the marketing/customer web experience if simpler.

### production
Shop-floor / tablet / workstation experience. Prioritize large touch targets, clarity, low-friction state changes and intermittent-connectivity resilience where needed.

### partner-portal
Future scoped collaboration interface for subcontractors/partner organizations. Do not build in MVP unless needed, but preserve domain boundaries.

### api
Primary backend application/composition root for modular monolith modules and external API/webhooks.

## Modules
A module owns its business rules and persistence boundary. Other modules should not reach directly into its tables/repos to mutate state.

Cross-module interaction should happen through:
- explicit application/domain services
- commands
- domain events
- read models/contracts where justified

## Packages
`packages` contains reusable technical/product primitives, not business-domain dumping grounds.

Examples:
- UI primitives/design tokens
- shared types with clear ownership
- DB tooling/migrations infrastructure
- config validation
- AI provider adapters/tool contracts
- design system

Avoid creating a giant `shared` package containing arbitrary business logic.

## Extraction path
If scale or team boundaries later justify service extraction, a well-bounded module should be extractable behind an API/event contract without rewriting the entire domain.

That future possibility is the reason for strong boundaries now; it is not a reason to start with microservices.
