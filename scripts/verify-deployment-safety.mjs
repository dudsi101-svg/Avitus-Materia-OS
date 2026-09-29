import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Evaluate the actual job predicate, without executing workflow expressions.
const workflow = readFileSync(new URL('../.github/workflows/deploy-fly.yml', import.meta.url), 'utf8');
const expression = workflow.match(/  deploy:\n    if: >-\n([\s\S]*?)    runs-on:/)?.[1];
assert.ok(expression, 'Deployment must have a job-level provenance guard');
const clauses = expression.trim().split(/\s*&&\s*/).map((clause) => {
  const match = clause.trim().match(/^(github\.[\w.]+) == (?:'([^']*)'|(github\.[\w.]+))$/);
  assert.ok(match, `Unsupported guard clause; review safety test: ${clause}`);
  return match;
});
const lookup = (context, path) => path.split('.').reduce((value, key) => value?.[key], context);
const allowed = (run) => {
  const context = { github: { repository: 'owner/project', event: { workflow_run: run } } };
  return clauses.every(([, left, literal, right]) => {
    const value = lookup(context, left);
    return value !== undefined && value === (right ? lookup(context, right) : literal);
  });
};
const trusted = { conclusion: 'success', event: 'push', head_branch: 'main', head_repository: { full_name: 'owner/project' } };
const scenarios = [
  ['successful main push', trusted, true],
  ['same-repository pull request', { ...trusted, event: 'pull_request' }, false],
  ['fork pull request with main branch', { ...trusted, event: 'pull_request', head_repository: { full_name: 'fork/project' } }, false],
  ['foreign repository push', { ...trusted, head_repository: { full_name: 'fork/project' } }, false],
  ['feature push', { ...trusted, head_branch: 'feature' }, false],
  ...['failure', 'cancelled', 'skipped'].map((conclusion) => [conclusion, { ...trusted, conclusion }, false]),
  ['missing repository', { ...trusted, head_repository: undefined }, false],
  ['missing event', { ...trusted, event: undefined }, false],
];
for (const [name, run, expected] of scenarios) assert.equal(allowed(run), expected, name);
console.log(`Deployment provenance: ${scenarios.length} scenarios passed`);
