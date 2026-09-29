const { test } = require('node:test');
const assert = require('node:assert/strict');
const { diagnose } = require('./diagnose-production-db.cjs');
const env = { DATABASE_URL: 'secret-url', PUBLIC_INQUIRY_ORGANIZATION_ID: '22222222-2222-4222-8222-222222222222' };
function fake(fail = false) {
  const queries = []; let ended = false;
  class Pool {
    constructor(options) { assert.equal(options.max, 1); assert.equal(options.statement_timeout, undefined); assert.equal(options.query_timeout, 7000); }
    on() {}
    async connect() { return { query: async (sql) => {
      queries.push(sql);
      if (fail && sql.startsWith('SELECT')) throw Object.assign(new Error('secret-url customer@example.org'), { code: '57014', detail: 'private' });
      return { rows: [{ present: true, products: 3, email: 'private', active: 'private' }] };
    }, release: () => {} }; }
    async end() { ended = true; }
  }
  return { Pool, queries, ended: () => ended };
}
test('diagnostics are read-only, bounded and output only numeric/boolean allowlisted fields', async () => {
  const f = fake(); const records = [];
  assert.equal(await diagnose(f.Pool, env, r => records.push(r)), true);
  assert.equal(f.queries[0], 'BEGIN READ ONLY');
  assert.equal(f.queries.at(-1), 'ROLLBACK');
  assert.equal(f.queries[1], "SET LOCAL statement_timeout = '5s'");
  assert.ok(f.queries.slice(2, -1).every(q => q.startsWith('SELECT')));
  assert.equal(records.length, 6); assert.ok(f.ended());
  assert.doesNotMatch(JSON.stringify(records), /private|secret-url|22222222|email/);
});
test('errors expose only a safe code and always close the connection', async () => {
  const f = fake(true); const records = [];
  assert.equal(await diagnose(f.Pool, env, r => records.push(r)), false);
  assert.deepEqual(records, [{ event: 'db.diagnostic', stage: 'server', ok: false, code: '57014' }]);
  assert.equal(f.queries.at(-1), 'ROLLBACK'); assert.ok(f.ended());
});
test('invalid config never opens a connection', async () => {
  const records = [];
  assert.equal(await diagnose(class { constructor() { throw Error('must not connect'); } }, {}, r => records.push(r)), false);
  assert.equal(records[0].stage, 'config');
});
