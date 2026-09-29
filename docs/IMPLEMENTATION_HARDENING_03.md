# Hardening 03 — deployment provenance

Date: 2026-09-29. Status: IMPLEMENTED / locally TESTED; remote CI, merge and workflow verification pending.

## Problem and evidence

At main `04f697d`, the privileged `workflow_run` deployment job checked only successful CI and a branch named `main`. CI also runs for pull requests. A PR branch named main therefore satisfied the predicate, despite not being an approved push to this repository. The deployment job checks out the triggering head SHA and receives the Fly token plus repository write permission.

Classify R18 P0: untrusted code could enter a privileged deployment job. This is a configuration finding, not evidence of exploitation. No exploit or secret access was attempted.

GitHub documents the privilege boundary: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run

## Change and acceptance criteria

The job now requires all four facts before starting: successful CI, push event, main branch, and head repository matching this repository. PR events, foreign repositories and missing provenance fail closed. No application or database changes.

A dependency-free regression script evaluates the actual YAML predicate using a restricted comparison grammar (no eval). Ten scenarios cover trusted push, same-repository PR, fork PR named main, foreign push, feature push, three unsuccessful conclusions and missing fields. CI runs this guard before installation.

## Verification

Before the fix, the regression failed because a same-repository PR was admitted. After the fix, all ten scenarios pass. This is a synthetic predicate test, not a live attack. Remote CI and the production workflow must be checked after merge. There is no migration or application smoke requirement for the predicate itself; existing application health remains independently checked.

## Risks and rollback

A future GitHub payload change may cause a safe skipped deployment; inspect provenance before changing the predicate. Do not roll back to the unsafe two-condition predicate. Repository write access and mutable action references remain separate hardening considerations. Deployment target dependency coverage (R13) is unchanged by this focused fix.
