// Read-only probe transport. Never print machine configuration or raw CLI errors.
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const fields = {
  'catalog.config': { api_url_present: 'boolean', api_key_present: 'boolean', origin_allowed: 'boolean' },
  'catalog.upstream': { status: 'number', products: 'number', ok: 'boolean' },
  'catalog.page': { status: 'number', form: 'boolean', demo: 'boolean', ok: 'boolean' },
  'catalog.failure': {}, 'catalog.deadline': {},
};
function runProbe(app, source, execute = execFileSync, emit = record => console.log(JSON.stringify(record))) {
  let stage = 'list';
  try {
    if (app !== 'avitus-materia-web') throw Error('unexpected app');
    const call = args => JSON.parse(execute('flyctl', args, { encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
    const machines = call(['machine', 'list', '-a', app, '--json']);
    const started = machines.filter(machine => machine.state === 'started');
    if (!started.length || started.length > 4 || started.some(m => !/^[a-f0-9]+$/.test(m.id))) throw Error('unexpected machines');
    emit({ event: 'catalog.machines', started: started.length });
    stage = 'secret_names';
    const secrets = call(['secrets', 'list', '-a', app, '--json']);
    if (!Array.isArray(secrets) || secrets.some(s => typeof s.name !== 'string')) throw Error('unexpected secrets');
    const secretPresent = name => secrets.some(s => s.name === name);
    let missingConfig = false;
    for (const [index, machine] of started.entries()) {
      const env = machine.config?.env || {};
      const urlPresent = Boolean(env.AVITUS_API_URL) || secretPresent('AVITUS_API_URL');
      const keyPresent = Boolean(env.PUBLIC_INQUIRY_API_KEY) || secretPresent('PUBLIC_INQUIRY_API_KEY');
      emit({ event: 'catalog.config_inventory', machine: index + 1, api_url_present: urlPresent, api_key_present: keyPresent,
        api_url_secret_present: secretPresent('AVITUS_API_URL'), api_key_secret_present: secretPresent('PUBLIC_INQUIRY_API_KEY') });
      missingConfig ||= !urlPresent || !keyPresent;
    }
    if (missingConfig) return false;
    let passed = true;
    const command = 'node -e ' + "'" + (source + '\nrun();').replaceAll("'", "'\\''") + "'";
    for (const [index, machine] of started.entries()) {
      stage = 'exec';
      const result = call(['machine', 'exec', machine.id, command, '-a', app, '--timeout', '30', '--json']);
      let pagePassed = false;
      for (const line of (result.stdout || '').split('\n').filter(Boolean)) {
        const record = JSON.parse(line);
        if (!Object.hasOwn(fields, record.event)) throw Error('unexpected output');
        const safe = { event: record.event, machine: index + 1 };
        for (const [key, type] of Object.entries(fields[record.event])) {
          if (typeof record[key] === type) safe[key] = record[key];
        }
        emit(safe);
        if (safe.event === 'catalog.page' && safe.status === 200 && safe.form === true && safe.demo === false && safe.ok === true) pagePassed = true;
      }
      // flyctl returns success even when the remote process exits nonzero.
      passed = passed && (result.exit_code === undefined || result.exit_code === 0) && !result.stderr && pagePassed;
    }
    return passed;
  } catch (error) {
    const raw = String(error?.stderr || '');
    const reason = error?.code === 'ETIMEDOUT' ? 'local_timeout'
      : /timed out|timeout|deadline exceeded/i.test(raw) ? 'remote_timeout'
      : /unauthorized|forbidden|\b401\b|\b403\b/i.test(raw) ? 'access_denied'
      : error instanceof SyntaxError ? 'invalid_json' : 'unclassified';
    emit({ event: 'catalog.transport_failure', stage, reason });
    return false;
  }
}
module.exports = { runProbe };
if (require.main === module) process.exitCode = runProbe(process.env.FLY_WEB_APP, readFileSync('scripts/verify-catalog-capability.cjs', 'utf8')) ? 0 : 1;
