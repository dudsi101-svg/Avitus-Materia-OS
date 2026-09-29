# Next Action

Updated 2026-09-29. Read WORK_BOARD and COORDINATION before claiming work.

## Current position
Sprint 9 and hardening PR29–36 are deployed. Migration 0011 is in successful release 36611978132, API tag 18b10a9; clean-load, tenant-write and migration-rollback tests pass. The membership read/write invariant is closed for this slice; other domain isolation remains open. Production login and the workshop/cost loop are not operational.

## Ordered queue
1. Continue P0 Gate 1 evidence: backup inventory/isolated restore, alert delivery, public edge/per-client/request-size protection and privacy lifecycle. Existing Fly SSH is available through the trusted pipeline; do not request an extra token without first checking existing capabilities.
2. Diagnose web configurator runtime catalog access (R17): the DB has two products but the public page still shows a demo. Verify configuration without printing secrets; restore functional intake and add a meaningful capability check.
3. Inventory other cross-tenant FKs and add focused negative/concurrency/failure-path tests. Membership read/write hardening is not proof for the other aggregates.
4. Patch triaged dependency advisories with full CI; cover packages/shared in API deployment target detection.
5. Production identity + authenticated admin, then acceptance/Order/Project UI and commercial communication/document evidence.
6. Verified Physical Truth staging -> material/production/QC/delivery -> actual cost/margin pilot. Capacity recommendations, automation/AI and partners follow reliable measurements.

## Owner dependencies
Approved identity-provider configuration, alert destinations, workshop facts and legal retention/payment/acceptance policy. Use existing operational access for read-only diagnosis; never ask for secrets in chat. No new owner decision is needed for the current membership hardening.
