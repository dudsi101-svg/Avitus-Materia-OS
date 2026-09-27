# Production deploy blocker — FLY_API_TOKEN

Status: **token present but rejected**, confirmed on 2026-09-27.

## Evidence
- Earlier runs (#15, #17) stopped at `Validate deployment token` because the secret was missing.
- The secret has since been added, but `Deploy Fly Production` run 25 (commit `78d5c41`, web-only release) fails at
  `flyctl deploy -c fly.web.toml -a avitus-materia-web` with `Error: unauthorized`. The app config itself validates.
- Conclusion: the stored token has no deploy rights to `avitus-materia-web` (and probably `avitus-materia-api`) — e.g. an
  app-scoped token for a different app, a token from another organization, or an expired/revoked token.

## Required one-time owner action
1. With `flyctl` logged in to the account that owns both apps (`fly apps list` must show `avitus-materia-web` and
   `avitus-materia-api`), create an organization deploy token:
   `fly tokens create org --org <org-slug> --name github-actions-avitus` (org slug from the ORG column; scripts default to `personal`).
2. Replace the GitHub Actions secret `FLY_API_TOKEN` with the full output (including the `FlyV1` prefix).
3. Re-run the latest failed `Deploy Fly Production` run, or merge the next verified change to `main`.

Never commit the token. After a successful run, verify `/ready`, the homepage, `/kreator` and a public inquiry.
