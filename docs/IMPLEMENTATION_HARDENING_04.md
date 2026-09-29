# Hardening 04 — bounded database release diagnostics

Goal: investigate two failed API releases without printing connection strings, customer rows or query text. Existing API remains reachable; migration 0010 applied, but organization bootstrap terminates its connection after about a minute.

Current state: PR30 API activation blocked. Main and PR CI are green. Provider-level root cause is unknown; do not infer corruption or fix by dropping/resetting data.

Change: before API release, execute a reviewed diagnostic on the existing API machine through Fly SSH using the existing deployment identity. All five checks run inside BEGIN READ ONLY, followed by ROLLBACK. One connection; 5s connection/server query limits, 7s client query limit, 45s process deadline, 90s SSH deadline. No new credential, customer write, restart, migration or paid service is introduced.

Outputs: server recovery/read-only booleans, configured organization existence, scoped catalog count, aggregate activity/lock counts. Output fields and primitive types are allowlisted. Errors expose only safe codes; no messages, SQL, names, IDs, URLs or query values. Three tests cover read-only order, output privacy, failure cleanup and invalid config.

Acceptance: full CI; trusted-main workflow starts; diagnostic either provides these bounded facts or fails closed before another rollout. If preflight passes, normal release can proceed with new database evidence. SSH permissions may be narrower than deployment permissions; if access is denied, record the exact missing permission rather than weakening authentication. Remove or refine this incident preflight after root cause resolution; it requires an already-running API and is not a first-deployment bootstrap mechanism.

Remaining questions: database lock wait vs connection/proxy termination; organization/catalog availability; current provider health. Aggregate pg_stat_activity visibility depends on database privileges and does not prove all sessions are visible.
