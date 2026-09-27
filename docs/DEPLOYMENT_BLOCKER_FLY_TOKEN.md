# Production deploy blocker — FLY_API_TOKEN

Status: confirmed on 2026-09-27.

The production deploy workflow now runs after a successful `main` CI, but fails at `Validate deployment token` because the repository secret `FLY_API_TOKEN` is not configured.

This is the only observed blocker before the workflow reaches `flyctl deploy`.

## Required one-time owner action

Create a Fly.io deploy token with access to `avitus-materia-api` and `avitus-materia-web`, then add it to the GitHub repository as an Actions secret named exactly:

`FLY_API_TOKEN`

Do not commit the token to the repository.

After the secret exists, rerun the most recent failed `Deploy Fly Production` workflow or push/merge another verified change to `main`. The workflow will:

1. deploy the API,
2. verify `/ready`,
3. deploy the public web,
4. verify that the web app is reachable.

Evidence: workflow runs #15 and #17 reached `Validate deployment token` and stopped there; code verification/CI was green.
