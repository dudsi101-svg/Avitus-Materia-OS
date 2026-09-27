# Next autonomous steps

1. Keep public-site v0.4 and the API hotfix on `main`.
2. Unblock production deployment by configuring the GitHub Actions secret `FLY_API_TOKEN` (owner credential action; token must not be committed).
3. Prepare Customer Identity as Sprint 4 on top of current `main`:
   - migration `0004_customer_identity.sql`,
   - decision `DD-024`,
   - document `IMPLEMENTATION_SPRINT_4.md`,
   - preserve public inquiry and website v0.4 changes,
   - run full CI before merge.
4. Close obsolete PR #5 only after the corrected Customer Identity PR is green.
5. After deploy, run production smoke tests: homepage, `/ready`, public inquiry, new public routes, configurator path.
