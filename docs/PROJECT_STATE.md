# Avitus Materia OS — Project State

**Checkpoint:** 2026-09-29, production hardening after Sprint 9.
**Verdict:** deployed sales foundation; operational v1 is not complete.

## Verified release evidence
- PR34/35: main CI 36568275366 and API deploy 36568473095 succeeded; deployed-api 56440aa. Active tenant/user/membership + matching role authorization and bounded bootstrap connection recovery are deployed.
- Production HTTP: /ready 200; unauthenticated /leads 401. External identity remains fail-closed and has no production login adapter.
- Role-integrity preflight: 0 invalid memberships. This is a point-in-time read, not a database write guarantee.
- Latest API release: 18b10a9. PR36 CI 36611428280 and main CI 36611710542 passed migration 0011, nine IAM cases and actual-SQL legacy rollback proof. Deployment 36611978132 succeeded, including migration/bootstrap and readiness; deployed-api tag matches.
- Web tag 04f697d: public proxy timeout/429 handling deployed. /kreator still renders ConfiguratorLite demo without a submission form despite two products existing in the database (R17).
- Full audit A–K, risks and dependency/gate plan: SYSTEM_RECONCILIATION_2026-09-28.md. Hardening 01–07 documents preserve incident and test evidence.

## Capability baseline
| Domain | Current truth | Status / remaining work |
|---|---|---|
| Architecture | Modular monolith; Next web/admin, Nest API, PostgreSQL/Drizzle, scoped services, exact decimal pricing, audit/outbox | Deployed foundation |
| Commercial | Leads/opportunities/catalog/configuration history, pricing/quote versions, customer identity/linking, buyer/tax/discount governance, READY/SENT | Partial operational journey; documents/sending/acceptance evidence incomplete |
| Order / Project | Accepted SENT QuoteVersion -> immutable Order snapshot + separate Project in one transaction | Minimal API slice deployed; UI, items/payment/delivery scope, tasks/approvals/change history incomplete |
| Public intake | Durable per-organization write budget, safe timeout/429, no automatic replay | Deployed; per-client/edge/size controls and idempotency remain open |
| IAM | Single-statement scoped authorization; active organization/user/membership; no implicit global-role grant | Tested/deployed; production IdP/operator login remains absent |
| Database role integrity | Composite membership role/tenant FK in migration 0011 | Migrated/deployed; negative-write and rollback proof in PostgreSQL CI |
| Error / release controls | PII-safe HTTP errors; trusted-main deployment provenance; bounded read-only DB diagnostics; idempotent bootstrap retry | Deployed; retry use in a successful live release was not independently measured |
| Physical Truth | Existing Drive workbooks mostly templates/unverified drafts | Not measured workshop truth; no source data modified |
| Manufacturing / cost | Material/production/QC/delivery/actual-cost loop absent | Not operational v1 |
| Automation / AI | Outbox is persisted, no publisher; no production AI context/tool layer | Later gates after reliable data |

## Open production gates
- R02: ingress abuse protections incomplete beyond the shared write budget; idempotency absent.
- R03/R04: backup restore and external alert delivery are unverified.
- R05: other cross-tenant relational invariants and broader permission/failure-path tests remain open; the membership slice does not close the whole domain model.
- R06/R07: privacy lifecycle/legal policy and production identity/operator access incomplete.
- R11/R13/R17: dependency advisories, shared-package deployment target gap, and demo configurator fallback remain unresolved.
- R19: intermittent bootstrap connection termination has controlled retry recovery; provider root cause is unproven. No database reset or credential change was performed.

## Sequence
Finish Gate 1/2 controls and functional intake/operator access; complete commercial/Order/Project execution; migrate verified workshop facts; implement materials, production/QC, delivery and actual-cost feedback; prove a real closed-loop v1 job. Then automation, AI and partners.

DATA TRUTH -> AUTOMATION -> INTELLIGENCE. CustomerAccount is not a login identity; Order is commercial truth and Project is execution truth.
