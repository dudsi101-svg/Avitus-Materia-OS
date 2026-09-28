# Avitus Materia OS — Implementation Sprint 6 (configurator request → sales work)

**Owner decision:** chosen on 2026-09-28 (option 2 after Sprint 5).
**Reservations:** migration `0007`, decision `DD-027`.

## Goal
- Show public configurator requests in the Command Center with readable option values.
- Convert a request with one click into an Opportunity (on the request's Lead) and Configuration v1 carrying exactly the customer's values.
- Make the conversion atomic, auditable and one-time.
- Hand the new configuration straight to the existing pricing → draft quote flow.

## Canonical slice
`PublicConfigurationRequest -> [convert] -> Opportunity + Configuration v1 + conversion record -> Audit + DomainEvents + Outbox -> PriceCalculation -> Draft Quote`

## Design (DD-027)
1. **Explicit human action.** Conversion is triggered by an operator (`acquisition.configuration_request.convert`), who must also hold `crm.opportunity.write` and `configurator.configuration.write`. No automatic conversion (DD-025 still holds).
2. **One transaction across modules without reaching into persistence internals.** `crm` and `configurator` export pure builders (`planOpportunityCreation`, `planConfigurationCreation`) that return entity + event + audit entry. The acquisition service persists them through the modules' repositories in one Unit of Work together with the conversion record. The existing `Create*Service` classes use the same builders, so their behavior is unchanged.
3. **One-time.** `public_configuration_request_conversions.request_id` is the primary key. A second click, including a concurrent one, returns `409 ACQUISITION.REQUEST_CONVERSION_CONFLICT`. Domain error codes ending in `_CONFLICT` now map to HTTP 409, which also applies to `QUOTE.VERSION_CONFLICT`.
4. **Catalog truth wins.** Values are re-validated against the current catalog at conversion time. If the product is no longer active, conversion is refused (`CATALOG.PRODUCT_NOT_FOUND`).
5. **The intake record stays immutable.** Conversion state lives in its own table; the request row is never updated.
6. **PII.** Contact data is visible only to users with `acquisition.configuration_request.read`. Events and audit carry ids and status only.

## API
- `GET /configuration-requests`: newest 100 in the caller's organization, with conversion state.
- `POST /configuration-requests/:id/convert` (optional `{ title, reason }`): returns `{ requestId, opportunityId, configurationId, configurationStatus }`.

## Command Center
- "Zapytania z kreatora" section at the top: product, customer, contact, option chips in catalog order, customer note, readiness, and a convert button or conversion ids.
- After conversion (or via "Wyceń"), the configuration loads into the pricing section, which is ready for "Przelicz cenę" → "Utwórz Quote v1".

## Tests
- Unit (acquisition): exact values carried over, one-time conversion, every permission required, unknown request/product, concurrent unique violation → conflict, PII absent from events and audit.
- API E2E: request from the public API → list → another organization cannot see or convert it (404) → convert (201) → Opportunity owner and title → Configuration v1 data equals the customer values → audit `CONVERT` without PII → configuration readable → second convert 409 → list shows the conversion; malformed and unknown ids → 404.
- Browser: kreator submit → Command Center convert → pricing → draft quote; mobile layout without overflow.

## Out of scope
- Assigning an owner or salesperson other than the converting user.
- Linking or creating a CustomerAccount from the request contact (Sprint 4 identity); a natural next step.
- Production identity provider for the Command Center (still development auth).
