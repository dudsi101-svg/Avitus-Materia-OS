# Avitus Materia OS — Implementation Sprint 1

**Branch:** `sprint-1/sales-foundation`
**Goal:** establish the first sales/configuration source-of-truth chain after Lead.

## Vertical slice

`Lead -> Opportunity -> Product -> Configuration -> ConfigurationVersion`

The slice must remain organization-scoped, auditable and event-aware.

## Scope

### Opportunity
- create opportunity from an existing Lead in the same organization
- list/read opportunities scoped to organization
- initial state `OPEN`
- optional estimated value/currency/probability/expected close date
- `OpportunityCreated` DomainEvent + AuditEvent in the same Unit of Work

### Catalog
- ProductFamily
- Product
- ProductOptionDefinition
- read catalog/product option schema through an explicit catalog service
- product-specific facts are data/seed, not Core constants

### Configuration
- create configuration for an Opportunity + Product from the same organization
- persist immutable `ConfigurationVersion` snapshots
- validate option values against ProductOptionDefinition
- unknown/type/range/enum violations are rejected
- missing required options result in `INCOMPLETE`
- complete valid data results in `READY_FOR_PRICING`
- create a new version rather than overwrite configuration history
- events/audit for creation/revision

### API
- `GET/POST /opportunities`
- `GET /opportunities/:id`
- `GET /catalog/products`
- `GET /catalog/products/:id`
- `POST /configurations`
- `GET /configurations/:id`
- `POST /configurations/:id/versions`

### Permissions
- `crm.opportunity.read`
- `crm.opportunity.write`
- `catalog.product.read`
- `configurator.configuration.read`
- `configurator.configuration.write`

### Tests
At minimum verify:
1. another organization cannot use/read a Lead/Opportunity/Product/Configuration it does not own,
2. Opportunity creation emits audit + domain/outbox event,
3. Configuration snapshots are versioned and previous versions are retained,
4. invalid option values are rejected,
5. missing required values produce `INCOMPLETE`,
6. a valid complete configuration becomes `READY_FOR_PRICING`,
7. CI remains green with frozen lockfile.

## Explicit non-goals
- quote/pricing engine
- customer portal
- visualization/image generation
- AI agent execution
- production/material planning
- customer acceptance/locking (introduced when commercial acceptance exists)

## Architecture rule
No new feature may bypass organization scope or write another module's tables directly from an external module. Cross-domain behavior goes through services/repositories/events.
