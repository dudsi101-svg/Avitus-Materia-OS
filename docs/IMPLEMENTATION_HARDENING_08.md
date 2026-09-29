# Hardening 08 — public configurator capability diagnosis

R17 P1: production /kreator returns 200 with ConfiguratorLite demo and no request form, although the database has two products. Source catalog loader silently returns null for missing URL/key, upstream status, timeout or invalid response. fly.web.toml does not declare AVITUS_API_URL; runtime secrets may still provide it, so this is not yet a confirmed cause.

Add a GET-only capability probe on the existing web machine via the trusted Fly deployment job. It runs after deployment/no-change handling. It reports configuration presence and allowed-origin booleans, upstream HTTP status/product count, and page form/demo booleans. Secret goes only to approved project API origins; no credentials, URLs, exceptions, catalog rows or customer data are printed. Each request has an 8s timeout, process deadline 25s, SSH deadline 60s. It creates no customer records and does not submit the form.

HTTP 200 with demo is now a failed capability check. This can mark the workflow failed even when application deployment/health succeeded; per-app tags record deployed code, not proof of the whole customer journey. API/security rollouts execute before this check, so existing configurator failure does not prevent their application deployment. It is not a full inquiry E2E or alert destination configuration.

Six local tests cover config/destination boundary, upstream rejection, empty catalog, catalog + rendered form, silent demo and private network-error handling. Ten deployment provenance cases still pass. No source data, runtime credentials or application behavior changes in this diagnostic slice. Obtain live facts before implementing the repair.
