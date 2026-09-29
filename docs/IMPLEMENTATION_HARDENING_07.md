# Hardening 07 — tenant role database invariant

Problem: PR34 protects authorization reads, but the single-column role FK still allows a writer to assign a role from another organization. Production preflight in release 36568473095 found zero invalid memberships; no data repair is required by that observation.

Implementation: migration 0011 creates a unique (role id, organization id) index and a composite membership FK. Existing role ID FK remains. Unassigned roles may have null organization; a membership must reference a role with matching non-null organization. Parent role re-scoping and membership tenant moves cannot bypass this invariant. Drizzle schema mirrors the SQL constraint.

Migration safety: 5s lock timeout, 30s statement timeout, transactional migration runner. Add NOT VALID then validate before commit. Invalid existing data, contention or timeout aborts the migration; no memberships are rewritten/deleted. SQL is not marked applied unless the same transaction commits. Rollback of application code can retain this compatible invariant. Removing it is a deliberate reviewed SQL change, not an automatic deployment fallback.

Acceptance: clean-load migration/seed; nine IAM PostgreSQL tests including rejected insert/update/role reparenting and valid same-tenant assignment; the actual migration SQL tested against session-local legacy tables with invalid data, proving full DDL rollback and preservation of the row. Full CI, production migration/readiness and preflight proof required before DONE.

Local database/IAM typechecks and coordination checks pass. PostgreSQL tests await CI (no local server). No production login or new permissions are enabled. Other domain composite FKs and broader R05 isolation tests remain open.
