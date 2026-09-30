const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runProbe } = require('./run-catalog-probe.cjs');
const page = JSON.stringify({ event: 'catalog.page', status: 200, form: true, demo: false, ok: true });
function exercise(result, machines = [{ id: 'abc123', state: 'started', config: { secret: 'secret-value' } }]) {
  const records = [], calls = [];
  const passed = runProbe('avitus-materia-web', 'SOURCE', (_, args) => { calls.push(args); return JSON.stringify(args[1] === 'list' ? machines : result); }, r => records.push(r));
  return { passed, records, calls };
}
test('validates every started machine and preserves shell quoting', () => {
  const result = exercise({ stdout: page }, [{ id: 'abc', state: 'started' }, { id: 'def', state: 'started' }, { id: 'aaa', state: 'stopped' }]);
  assert.equal(result.passed, true); assert.equal(result.calls.length, 3);
  assert.equal(result.calls[1][2], 'abc'); assert.equal(result.calls[2][2], 'def');
  assert.equal(result.calls[1][3], "node -e 'SOURCE\nrun();'");
});
test('nonzero remote exit, empty output and demo fail even when flyctl succeeds', () => {
  for (const result of [{ exit_code: 1, stdout: page }, {}, { stdout: '{"event":"catalog.page","ok":false}' }, { stdout: page, stderr: 'secret-value' }]) assert.equal(exercise(result).passed, false);
});
test('does not print machine config, unknown fields or raw errors', () => {
  const result = exercise({ stdout: JSON.stringify({ event: 'catalog.failure', secret: 'secret-value', stage: 'secret-value' }) });
  assert.doesNotMatch(JSON.stringify(result.records), /secret-value/);
  const records = [];
  assert.equal(runProbe('avitus-materia-web', '', () => { throw Error('secret-value'); }, r => records.push(r)), false);
  assert.deepEqual(records, [{ event: 'catalog.transport_failure', stage: 'list' }]);
});
test('no running machines and unexpected output fail closed', () => {
  assert.equal(exercise({}, []).passed, false);
  assert.equal(exercise({ stdout: 'secret-value' }).passed, false);
});
