# Hardening 04 — bounded database release diagnostics

Goal: investigate two failed API releases without printing connection strings, customer rows or query text. Existing API remains reachable; migration 0010 applied, but organization bootstrap terminates its connection after about a minute.

Current state: PR30 API activation blocked. Main and PR CI are green. Provider-level root cause is unknown; do not infer corruption or fix by dropping/resetting data.

Change: before API release, execute a reviewed diagnostic on the existing API machine through Fly SSH using the existing deployment identity. All five checks run inside BEGIN READ ONLY, followed by ROLLBACK. One connection; 5s connection/server query limits, 7s client query limit, 45s process deadline, 90s SSH deadline. No new credential, customer write, restart, migration or paid service is introduced.

Outputs: server recovery/read-only booleans, configured organization existence, scoped catalog count, aggregate activity/lock counts. Output fields and primitive types are allowlisted. Errors expose only safe codes; no messages, SQL, names, IDs, URLs or query values. Three tests cover read-only order, output privacy, failure cleanup and invalid config.

Acceptance: full CI; trusted-main workflow starts; diagnostic either provides these bounded facts or fails closed before another rollout. If preflight passes, normal release can proceed with new database evidence. SSH permissions may be narrower than deployment permissions; if access is denied, record the exact missing permission rather than weakening authentication. Remove or refine this incident preflight after root cause resolution; it requires an already-running API and is not a first-deployment bootstrap mechanism.

Remaining questions: database lock wait vs connection/proxy termination; organization/catalog availability; current provider health. Aggregate pg_stat_activity visibility depends on database privileges and does not prove all sessions are visible.

## Verification checkpoint
PR #32 merged as f264943e56eb7b5cf55322ffa3fb43cada004ca5. PR CI 36563933592 passed full migrations/seed/lint/typecheck/tests/build and the three diagnostic safety tests. Local YAML and embedded Python parsed successfully; deployment provenance guard still passes ten scenarios. Main CI 36564185230 passed. Live preflight run 36564411891 reached the API over SSH, then failed at connect with SQLSTATE 08P01. No diagnostic query or new release was executed.

### Pooler compatibility correction
The first diagnostic supplied statement_timeout in the PostgreSQL startup packet. PgBouncer may reject untracked startup parameters (https://www.pgbouncer.org/config#ignore_startup_parameters); 08P01 is consistent with this, but does not prove the original bootstrap failure cause. Move the timeout to SET LOCAL inside BEGIN READ ONLY, retaining client/process deadlines. Tests require the local timeout and prohibit the startup parameter. No provider settings are changed.

PR #33 compatibility correction merged as d3a8de658c2dcd595ac84f4d99875b865b25129b after full PR CI 36564643971 passed. The diagnostic requires no additional owner credentials: Fly SSH access was verified by run 36564411891. Original bootstrap root cause remains unresolved until corrected live checks run.

## Live outcome
Main CI 36564958790 passed; deploy run 36565136322 succeeded. At 11:59 UTC, preflight reported recovery=false, transaction read_only=true, configured organization present, 2 catalog products, 0 visible idle transactions, 0 visible lock waits and 0 exclusive locks. Checks took 2–5 ms each. Counts are a point-in-time observation with database-role visibility limits, not proof of historical absence of locks. API release then succeeded, readiness passed and deployed-api moved to d3a8de6 at approximately 12:02 UTC.

The diagnostic startup compatibility issue is resolved. Original bootstrap connection termination was not reproduced and its root cause remains unknown (R19). Keep bounded preflight for existing production deployments; do not claim this added monitoring/alert routing or a backup restore test.
