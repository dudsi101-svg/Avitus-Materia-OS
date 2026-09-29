# Hardening 06 — bounded bootstrap connection recovery

Problem: releases 36533542370, 36534332017 and 36567266889 failed with a wrapped PostgreSQL connection termination during organization bootstrap, while read-only preflight and the running API were healthy. Release 36565136322 succeeded in between. Provider/network root cause is unproven.

Scope: retry only the existing idempotent production bootstrap, at most three attempts, with 1s/2s backoff. Every attempt creates its own database pool and closes it in finally. Organization/catalog insert-on-conflict operations and null-only presentation backfill preserve existing data across a retry. This helper is not used for inquiries, orders, payments, arbitrary writes or migrations.

Only allowlisted connection/availability failures or the exact driver connection-termination error qualify, including wrapped causes. Validation, authorization, constraint, protocol and unclassified failures fail immediately. Emit bounded structured attempt/success records instead of raw Drizzle errors, SQL parameters or organization identifiers. Original cause remains available only for internal propagation; entrypoint never prints it.

Tests cover wrapped transport recovery, exact retry ceiling/backoff, privacy of output, no retry of constraints/permissions/protocol/deadlock and validation failures. No database/schema/authentication changes. No automatic customer replay or generic deployment retry. Remaining risk: three transient failures still abort release; this is controlled recovery, not a diagnosis of the underlying provider fault. Existing bootstrap query completion/connection-close behavior remains unchanged.

Acceptance: local helper tests/typecheck; full CI; release logs show successful bootstrap and readiness; IAM PR34 then verified deployed. Update Hardening 05 and PROJECT_STATE with the actual result.
