# Hardening 08 — public configurator capability diagnosis

R17 P1: production /kreator returns 200 with ConfiguratorLite demo and no request form, although the database has two products. Source catalog loader silently returns null for missing URL/key, upstream status, timeout or invalid response. fly.web.toml does not declare AVITUS_API_URL; runtime secrets may still provide it, so this is not yet a confirmed cause.

Add a GET-only capability probe on the existing web machine via the trusted Fly deployment job. It runs after deployment/no-change handling. It reports configuration presence and allowed-origin booleans, upstream HTTP status/product count, and page form/demo booleans. Secret goes only to approved project API origins; no credentials, URLs, exceptions, catalog rows or customer data are printed. Each request has an 8s timeout, process deadline 25s, SSH deadline 60s. It creates no customer records and does not submit the form.

HTTP 200 with demo is now a failed capability check. This can mark the workflow failed even when application deployment/health succeeded; per-app tags record deployed code, not proof of the whole customer journey. API/security rollouts execute before this check, so existing configurator failure does not prevent their application deployment. It is not a full inquiry E2E or alert destination configuration.

Seven local tests cover config/destination boundary, upstream rejection, empty catalog, catalog + rendered form, silent demo and private network-error handling. Ten deployment provenance cases still pass. No source data, runtime credentials or application behavior changes in this diagnostic slice. Obtain live facts before implementing the repair.

Allowed API origins include the documented private Fly address http://avitus-materia-api.internal:4000 (DEPLOYMENT_V0.1), the API fly.dev origin and the public api.avitus-materia.com origin. This prevents treating the existing documented private network route as an invalid destination.

PR37 merged as 49558e0d3a641f73bdf106bfe26455a1dbc52913 after full CI 36613474161 passed, including seven probe tests and ten deployment provenance cases. Workflow YAML and embedded Python parsed locally. Live runtime evidence pending; no application or secret change has been made.

Production run 36614019692 failed at SSH transport timeout (60s), before any catalog event. This does not prove a missing URL/key or catalog failure. Follow-up uses Fly Machines exec, checking every started web machine (maximum four; 45s CLI deadline / 30s remote deadline), without starting/stopping machines. JSON output is captured privately and only allowlisted diagnostic fields are emitted. Remote exit_code and an explicit successful page result are required: official flyctl machine/exec.go returns CLI success even for nonzero remote exit. No raw CLI error, machine config, stderr or unknown output is logged. Transport tests cover remote failure, empty/unexpected output, instance coverage and privacy.
