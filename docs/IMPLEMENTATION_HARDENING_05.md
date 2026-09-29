# Hardening 05 — tenant membership authorization

Date: 2026-09-29. R05 P0 slice. No migration or new business role semantics.

## Problem / evidence
At main e841ad1, PostgresIdentityRepository checked active membership/user first, then joined permissions by role ID without matching the role organization. The database currently permits such cross-tenant assignments. Organization suspension was not checked. Two statements also used separate snapshots for membership and permission resolution.

DATA_MODEL states that users are global identities and membership/role belongs to an organization. Nullable role organization is not authority for implicit global access.

## Implementation
Resolve active organization, user, membership, tenant-matching role and permissions in one SELECT. Reject foreign-tenant and unscoped roles. Left joins retain legitimate memberships with an empty permission set. This closes the authorization read path without rewriting any stored membership or production identity configuration.

Add a bounded read-only preflight aggregate for memberships whose role scope is missing or different. Output is only a count, not user/role identifiers. This provides evidence before a subsequent database constraint migration.

## Acceptance and validation
Seven PostgreSQL integration cases: valid scoped permissions; wrong tenant/missing user; foreign role; unscoped role; no permissions; suspended user/membership/organization (the first case includes two negative assertions). Local IAM typecheck, three diagnostic safety tests and module-boundary check pass. Real database execution, full CI, merge, deployment and production preflight remain pending; no local PostgreSQL is available.

## Limits / rollback
No composite FK is introduced yet; invalid data can still be written by a faulty writer but cannot authorize access through this repository. R05 remains PARTIAL until database invariants and broader cross-tenant entity/permission tests are complete. Existing requests already authorized before suspension are not retroactively cancelled; this is a statement-consistent authorization check, not transaction-wide revocation.

Production auth remains external/fail-closed; this does not implement an IdP or operator login. Do not restore the unsafe authorization query as a workaround for invalid memberships. Investigate preflight results and repair data only with explicit evidence; no automatic role reassignment.

## CI / merge evidence
PR #34 merged as 5952d05b36d00e3a2cc836d5ecbbf38ad3488004. PR CI 36566764163 passed migrations/seed/lint/typecheck/tests/build. All seven IAM integration tests executed against PostgreSQL and passed (711 ms); no local database run is claimed. Main CI and production release evidence pending.

Main CI 36567038451 passed. Deployment 36567266889 preflight reported invalid_memberships=0, but API release failed in the existing bootstrap with connection termination; IAM code is not yet deployed. No migration was attempted. Stabilize bootstrap before marking this slice DEPLOYED.

## Deployment verified
Main CI 36568275366 and API deployment 36568473095 succeeded. deployed-api points to 56440aa36f4602fa4eed8fb31b1f99ac0f7ea0c9. Readiness passed; role-integrity preflight reported 0 invalid memberships. This supersedes the earlier blocked rollout. Successful Fly logs do not expose the number of bootstrap attempts; retry behavior is proven by tests, not claimed as a live forced failure.
