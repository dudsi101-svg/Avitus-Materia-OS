# Production deploy blocker — FLY_API_TOKEN

Status: **resolved on 2026-09-28.**

## History
- Runs #15/#17: secret missing.
- Run 25 (2026-09-27) and run 33 attempt 1 (2026-09-28): secret present but rejected by Fly (`Error: unauthorized`).
- 2026-09-28: the owner replaced the secret with an organization deploy token. Run 35 attempt 2 deployed the API
  (migrations 0004–0006, starter catalog). Run 33 attempt 2 deployed web v0.4 + configurator and the API; both
  verification steps passed.

## Follow-up fix
A deploy that failed or was skipped used to lose its pending app changes, because targets were detected only from
the last commit (`HEAD^..HEAD`): web v0.4 and the configurator were not deployed by run 35. The workflow now diffs
against the `deployed-web` / `deployed-api` tags, which it moves after each verified deploy. Until an app has been
deployed once with the new workflow (no tag yet), detection falls back to the previous commit.

## If the token stops working again
1. `fly auth login` on the account that owns `avitus-materia-web` and `avitus-materia-api` (`fly apps list`).
2. `fly tokens create org --org <org-slug> --name github-actions-avitus`.
3. Replace the GitHub Actions secret `FLY_API_TOKEN` with the full output (including `FlyV1`).
4. Re-run the failed `Deploy Fly Production` run.

Never commit the token.
