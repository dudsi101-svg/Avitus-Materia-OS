# Next Action

Updated 2026-09-29 after reconciliation and hardening PRs #29–#33.
Read WORK_BOARD and COORDINATION before claiming a lane.

## Current position
Sprint 9 is merged and API-deployed, not merely planned. Internal production auth is absent; Order/Project are minimal API aggregates. No complete manufacturing/cost loop exists. See SYSTEM_RECONCILIATION_2026-09-28.md for evidence and risk priorities.

## Ordered queue
1. **Completed:** PR #29 raw HTTP exception redaction + reconciled docs; full main CI and API deployment 36465461468 succeeded; no migration. Continue with remaining Gate 1 controls below.
2. Diagnose production ConfiguratorLite fallback (still observed after PR30 web deploy): verify runtime catalog/credential configuration without exposing secrets; restore catalog UI and meaningful smoke. Fix deployment target coverage for `packages/shared`; patch triaged dependency advisories with full CI.
3. PR30 implemented durable intake budget + safe proxy timeout/429. Finish edge/per-client/request-size/idempotency/security-header controls; verify recovery and alerting with actual provider evidence.
4. Tenant role/FK invariants + Sprint 9 permission/tenant/concurrency/failure-path tests.
5. Production identity and authenticated admin; acceptance/Order/Project UI; real browser proof.
6. Finish commercial document/sending/acceptance evidence and Order/Project execution scope.
7. Stage verified Physical Truth with aliases/units/provenance; material and production/QC/delivery/actual-cost vertical pilot.
8. Capacity recommendations only after resource and measurement truth; automation/AI/partners after v1 loop.

## Real access / owner dependencies
Identity provider application configuration; Fly backup/restore and alert access; approved alert recipients; verified workshop facts; legal retention/payment/acceptance policy. Do not ask for secrets in chat. Continue independent safe engineering while these are pending.

## Handoff 2026-09-29
Hardening 02: PR30 merged, migration 0010 / DD-030; real PostgreSQL concurrency tests and full CI passed. Hardening 03: PR31 merged; privileged deployment now requires successful same-repository push CI on main. See the implementation documents for final release evidence.

Release recovered: run 36565136322 deployed API d3a8de6 after successful read-only diagnostics. PR30 budget is deployed; migration 0010 applied. Original connection failure cause remains unproven (R19). Next safe P0 slice: tenant role/FK preflight and negative tests (R05), alongside obtaining actual recovery/alert evidence. Do not reset the database or invent a cause for the transient release failures. Keep deployment target coverage R13 and configurator observability R17 visible. Do not claim Gate 1 complete or move to autonomous pricing/capacity.

Active lane: Hardening 05 tenant membership authorization. Finish PostgreSQL CI, deploy and inspect invalid_memberships count before proposing a constraint migration. Do not infer global role semantics from nullable organization_id.
