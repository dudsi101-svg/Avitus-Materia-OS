# Next Action

Updated 2026-09-28 after reconciliation of main `68ea544` and API deploy #78.
Read WORK_BOARD and COORDINATION before claiming a lane.

## Current position
Sprint 9 is merged and API-deployed, not merely planned. Internal production auth is absent; Order/Project are minimal API aggregates. No complete manufacturing/cost loop exists. See SYSTEM_RECONCILIATION_2026-09-28.md for evidence and risk priorities.

## Ordered queue
1. **Completed:** PR #29 raw HTTP exception redaction + reconciled docs; full main CI and API deployment 36465461468 succeeded; no migration. Continue with remaining Gate 1 controls below.
2. Diagnose production ConfiguratorLite fallback: verify runtime catalog/credential configuration without exposing secrets; restore catalog UI and meaningful smoke. Fix deployment target coverage for `packages/shared`; patch triaged dependency advisories with full CI.
3. Public intake rate limits/timeout/idempotency/security headers; verify recovery and alerting with actual provider evidence.
4. Tenant role/FK invariants + Sprint 9 permission/tenant/concurrency/failure-path tests.
5. Production identity and authenticated admin; acceptance/Order/Project UI; real browser proof.
6. Finish commercial document/sending/acceptance evidence and Order/Project execution scope.
7. Stage verified Physical Truth with aliases/units/provenance; material and production/QC/delivery/actual-cost vertical pilot.
8. Capacity recommendations only after resource and measurement truth; automation/AI/partners after v1 loop.

## Real access / owner dependencies
Identity provider application configuration; Fly backup/restore and alert access; approved alert recipients; verified workshop facts; legal retention/payment/acceptance policy. Do not ask for secrets in chat. Continue independent safe engineering while these are pending.

## Active lane 2026-09-29
Finish Hardening 02 (`codex/public-intake-budget`): migration 0010, durable shared budget for both public writes, web timeout/429 handling. Run real PostgreSQL CI before merge and release. Then verify deployed API and web behavior; do not consume production budget with load tests or create fake customer records.

Deployment safety interruption (2026-09-29): finish Hardening 03 CI/merge verification for R18 P0, then record PR30 release evidence and continue Gate 1. Do not treat a green PR CI run as authorization to deploy its head.
