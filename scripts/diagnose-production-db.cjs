// Bounded, read-only production diagnostics. Never output rows, SQL or raw errors.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const checks = [
  ['server', "SELECT pg_is_in_recovery() AS recovery, current_setting('transaction_read_only') = 'on' AS read_only", []],
  ['organization', 'SELECT EXISTS (SELECT 1 FROM organizations WHERE id = $1) AS present', ['organization']],
  ['catalog', 'SELECT count(*)::int AS products FROM products WHERE organization_id = $1', ['organization']],
  ['role_integrity', 'SELECT count(*)::int AS invalid_memberships FROM organization_users m JOIN roles r ON r.id = m.role_id WHERE r.organization_id IS DISTINCT FROM m.organization_id', []],
  ['activity', "SELECT count(*) FILTER (WHERE state = 'active')::int AS active, count(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_transaction, count(*) FILTER (WHERE wait_event_type = 'Lock')::int AS waiting_lock FROM pg_stat_activity WHERE datname = current_database()", []],
  ['locks', "SELECT count(*) FILTER (WHERE NOT granted)::int AS waiting, count(*) FILTER (WHERE granted AND mode = 'AccessExclusiveLock')::int AS exclusive FROM pg_locks WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())", []],
];
const fields = new Set(['recovery', 'read_only', 'present', 'products', 'active', 'idle_transaction', 'waiting_lock', 'waiting', 'exclusive', 'invalid_memberships']);
function safeCode(error) {
  return typeof error?.code === 'string' && /^(?:[0-9A-Z]{5}|ECONNRESET|ECONNREFUSED|ETIMEDOUT)$/.test(error.code) ? error.code : 'UNCLASSIFIED';
}
async function diagnose(Pool, env, emit) {
  if (!env.DATABASE_URL || !UUID.test(env.PUBLIC_INQUIRY_ORGANIZATION_ID ?? '')) {
    emit({ event: 'db.diagnostic', stage: 'config', ok: false });
    return false;
  }
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000, query_timeout: 7000, application_name: 'avitus_readonly_diagnostic' });
  pool.on('error', () => {});
  let client;
  let stage = 'connect';
  try {
    client = await pool.connect();
    stage = 'transaction';
    await client.query('BEGIN READ ONLY');
    stage = 'limits';
    await client.query("SET LOCAL statement_timeout = '5s'");
    for (const [name, sql, params] of checks) {
      stage = name;
      const started = Date.now();
      const result = await client.query(sql, params.map(() => env.PUBLIC_INQUIRY_ORGANIZATION_ID));
      const values = Object.fromEntries(Object.entries(result.rows[0] ?? {}).filter(([key, value]) => fields.has(key) && (typeof value === 'boolean' || (Number.isSafeInteger(value) && value >= 0))));
      emit({ event: 'db.diagnostic', stage, ok: true, elapsed_ms: Date.now() - started, values });
    }
    return true;
  } catch (error) {
    emit({ event: 'db.diagnostic', stage, ok: false, code: safeCode(error) });
    return false;
  } finally {
    if (client) {
      try { await client.query('ROLLBACK'); } catch {}
      client.release(true);
    }
    await pool.end();
  }
}
module.exports = { diagnose };
function run() {
  const timer = setTimeout(() => { console.log(JSON.stringify({ event: 'db.diagnostic', stage: 'deadline', ok: false })); process.exit(1); }, 45000);
  const { Pool } = require('/app/packages/database/node_modules/pg');
  diagnose(Pool, process.env, (record) => console.log(JSON.stringify(record))).then((ok) => {
    clearTimeout(timer); process.exitCode = ok ? 0 : 1;
  }).catch(() => { clearTimeout(timer); console.log('{"event":"db.diagnostic","stage":"fatal","ok":false}'); process.exitCode = 1; });
}

if (require.main === module) run();
