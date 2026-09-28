# Avitus Materia OS — Implementation Sprint 5 (public configurator v1)

**Owner decision:** option A (customer-facing configurator) chosen on 2026-09-27.
**Reservations:** migration `0005`, decision `DD-025`.

## Goal
- Replace the hard-coded `/kreator` form with a configurator driven by the real product catalog.
- Validate a customer's choices with the same rules the Core uses (`assessConfiguration`).
- Let the customer send the configuration together with contact details in one step.
- Persist that as an immutable intake record linked to a new CRM Lead, with audit + events + outbox in one transaction.
- Give the operator the exact product and option values the customer chose, not free text.

## Canonical slice
`Catalog (CONFIGURABLE products) -> Public web /kreator -> Next server route -> Public Configurator API -> PublicConfigurationRequest + Lead -> Audit + DomainEvents + Outbox`

## Affected modules / entities
| Area | Change |
|---|---|
| `packages/database` | migration `0005_public_configuration_requests.sql`, schema, starter catalog (dev seed + production bootstrap) |
| `modules/acquisition` | `CreatePublicConfigurationRequestService`, repository |
| `modules/catalog` | read only (`ProductRepository.findActiveById`, `listActive`) |
| `modules/configurator` | read only (`assessConfiguration`, pure function) |
| `apps/api` | `PublicConfiguratorController` (`GET /public/configurator/products`, `POST /public/configurator/requests`) |
| `apps/web` | `/kreator` loads the catalog on the server, new client configurator with a live proportional schematic, `/api/configurator-request` proxy |

## Decisions (DD-025)
1. **No automatic Opportunity or Configuration.** A public request creates a Lead plus an immutable `PublicConfigurationRequest` snapshot (product id + SKU + name snapshot, option values, readiness assessment). Sales turns it into Opportunity -> Configuration in the Command Center. This keeps the CRM free of unqualified opportunities (AI_PRODUCT_CONFIGURATOR §13) and leaves the Configuration model's Opportunity requirement unchanged.
2. **No public price in v1.** Pricing rules in the database are development placeholders. Showing a price to a customer is a HIGH-risk commercial commitment (CLAUDE.md AI/risk policy) and needs approved price rules first. The UI says so honestly.
3. **Same trust boundary as public inquiry.** The web server uses the existing server-to-server credential (`x-avitus-public-inquiry-key`). The organization is chosen only by server configuration. The browser never sees the key.
4. **Public catalog projection.** Only active `CONFIGURABLE` products are exposed. `basePrice` and internal fields are never returned.
5. **Starter catalog.** Two products (table/top, sideboard) mirror the options already approved in website v0.4: width, depth, material and base. They are inserted idempotently with fixed IDs by `db:bootstrap:prod` (runs on every API release) and by the dev seed. Changing the catalog later happens through data, not code.
6. **PII stays in the intake record.** Events and audit contain ids, product SKU and readiness only.

## Sprint 5b — extensible options (DD-026, migration `0006`)
- `presentation` metadata on option definitions: group, hint, slider step, choice label/description/swatch
- starter catalog v2: table gains thickness (3–10 cm), edge (straight/natural), finish (natural oil/smoked oil/unfinished); sideboard gains height (40–120 cm, **range is a proposal for owner review**) and finish. Existing option rows get presentation backfilled only where it is empty, so later catalog edits are not overwritten
- website renders options generically by group (NUMBER, ENUM with swatches/descriptions, BOOLEAN, TEXT)
- drawing at true scale: top thickness, natural edge outline, finish tone, table height 75 cm, sideboard height
- shareable/bookmarkable configuration link (`/kreator?projekt=…&width_cm=…`), re-validated against the catalog (invalid values ignored, numbers snapped to range/step)

## Out of scope (next slices)
- indicative price / PriceEstimate (needs approved pricing rules)
- guest ConfigurationSession with save/resume
- AI-guided mode, inspiration mode, room photos, visualization
- lead-time estimates (needs capacity truth)
- admin screen for converting a request into Opportunity + Configuration (the data is already queryable; UI is the next slice)

## Tests
- unit: request validation, unknown product, invalid option value
- API E2E: catalog projection (no price fields), credential required, request creates Lead + request + events + audit, PII absent from events/audit, invalid option rejected
- web: typecheck + production build
