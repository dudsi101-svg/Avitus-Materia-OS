const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runProbe } = require('./run-catalog-probe.cjs');
const page = JSON.stringify({ event: 'catalog.page', status: 200, form: true, demo: false, ok: true });
function exercise(result, machines = [{ id: 'abc123', state: 'started', config: { secret: 'secret-value' } }]) {
  const records = [], calls = [];
  const passed = runProbe('avitus-materia-web', 'SOURCE', (_, args) => { calls.push(args); return JSON.stringify(args[0] === 'secrets' ? [{ name: 'AVITUS_API_URL' }, { name: 'PUBLIC_INQUIRY_API_KEY' }] : args[1] === 'list' ? machines : result); }, r => records.push(r));
  return { passed, records, calls };
}
test('validates every started machine and preserves shell quoting', () => {
  const result = exercise({ stdout: page }, [{ id: 'abc', state: 'started' }, { id: 'def', state: 'started' }, { id: 'aaa', state: 'stopped' }]);
  assert.equal(result.passed, true); assert.equal(result.calls.length, 4);
  assert.equal(result.calls[2][2], 'abc'); assert.equal(result.calls[3][2], 'def');
  assert.equal(result.calls[2][3], "node -e 'SOURCE\nrun();'");
});
test('nonzero remote exit, empty output and demo fail even when flyctl succeeds', () => {
  for (const result of [{ exit_code: 1, stdout: page }, {}, { stdout: '{"event":"catalog.page","ok":false}' }, { stdout: page, stderr: 'secret-value' }]) assert.equal(exercise(result).passed, false);
});
test('does not print machine config, unknown fields or raw errors', () => {
  const result = exercise({ stdout: JSON.stringify({ event: 'catalog.failure', secret: 'secret-value', stage: 'secret-value' }) });
  assert.doesNotMatch(JSON.stringify(result.records), /secret-value/);
  const records = [];
  assert.equal(runProbe('avitus-materia-web', '', () => { throw Error('secret-value'); }, r => records.push(r)), false);
  assert.deepEqual(records, [{ event: 'catalog.transport_failure', stage: 'list', reason: 'unclassified' }]);
});
test('no running machines and unexpected output fail closed', () => {
  assert.equal(exercise({}, []).passed, false);
  assert.equal(exercise({ stdout: 'secret-value' }).passed, false);
});

test('absent config inventory fails without exec and never emits secrets or digests', () => {
  const records = [], calls = [];
  assert.equal(runProbe('avitus-materia-web', '', (_, args) => {
    calls.push(args);
    return JSON.stringify(args[0] === 'secrets' ? [{ name: 'UNRELATED_SECRET', digest: 'private-digest' }] : [{ id: 'abc', state: 'started', config: { env: { OTHER: 'private-value' } } }]);
  }, r => records.push(r)), false);
  assert.equal(calls.length, 2);
  assert.equal(records.at(-1).api_url_present, false);
  assert.equal(records.at(-1).api_key_present, false);
  assert.doesNotMatch(JSON.stringify(records), /private|UNRELATED/);
});
test('remote timeout classification hides raw CLI error', () => {
  const records = [];
  assert.equal(runProbe('avitus-materia-web', '', () => { throw Object.assign(Error('private'), { stderr: 'request timed out private-value' }); }, r => records.push(r)), false);
  assert.equal(records[0].reason, 'remote_timeout');
  assert.doesNotMatch(JSON.stringify(records), /private/);
});
