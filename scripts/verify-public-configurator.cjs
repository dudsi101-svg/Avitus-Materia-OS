const { execFileSync } = require('node:child_process');
async function verifyPage(url, fetcher, emit) {
  try {
    const response = await fetcher(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const html = await response.text();
    const form = /<form\b[^>]*class="[^"]*\bamRequestForm\b/.test(html);
    const demo = html.includes('Ustalmy punkt startowy');
    const ok = response.status === 200 && form && !demo;
    emit({ event: 'catalog.public_page', origin: new URL(url).hostname, status: response.status, form, demo, ok });
    return ok;
  } catch { emit({ event: 'catalog.public_failure', origin: new URL(url).hostname }); return false; }
}
function safeCatalogLogs(raw) {
  const records = [];
  for (const line of raw.split('\n')) {
    const start = line.indexOf('{"event":"web.catalog"');
    if (start < 0) continue;
    try {
      const source = JSON.parse(line.slice(start, line.lastIndexOf('}') + 1));
      if (!['configuration_missing','upstream_http','invalid_payload','empty_catalog','available','network_failure'].includes(source.reason)) continue;
      const record = { event: 'web.catalog', reason: source.reason };
      if (['fly_private','fly_public','public_api','other','invalid'].includes(source.origin_kind)) record.origin_kind = source.origin_kind;
      for (const key of ['api_url_present','api_key_present']) if (typeof source[key] === 'boolean') record[key] = source[key];
      for (const key of ['status','products']) if (Number.isSafeInteger(source[key]) && source[key] >= 0) record[key] = source[key];
      if (['ENOTFOUND','ECONNREFUSED','ECONNRESET','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','TIMEOUT','OTHER'].includes(source.code)) record.code = source.code;
      records.push(record);
    } catch {}
  }
  return records.slice(-20);
}
async function verifyWithRefresh(fetcher, emit, now = Date.now, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), budgetMs = 330000) {
  // A build-time fallback can remain in Next ISR for 300s. Only GETs are retried.
  const deadline = now() + budgetMs;
  for (let attempt = 1; attempt <= 12; attempt++) {
    const results = await Promise.all(['https://avitus-materia-web.fly.dev/kreator', 'https://avitus-materia.com/kreator'].map(url => verifyPage(url, fetcher, emit)));
    if (results.every(Boolean)) return true;
    const remaining = deadline - now();
    if (remaining <= 0 || attempt === 12) return false;
    emit({ event: 'catalog.refresh_wait', attempt });
    await pause(Math.min(30000, remaining));
  }
  return false;
}
module.exports = { verifyPage, safeCatalogLogs, verifyWithRefresh };
async function run() {
  const emit = record => console.log(JSON.stringify(record));
  const passed = await verifyWithRefresh(fetch, emit);
  try {
    const raw = execFileSync('flyctl', ['logs', '--no-tail', '-a', 'avitus-materia-web'], { encoding: 'utf8', timeout: 45000, maxBuffer: 2 * 1024 * 1024, stdio: ['ignore','pipe','pipe'] });
    const records = safeCatalogLogs(raw);
    emit({ event: 'catalog.telemetry', records: records.length });
    records.forEach(emit);
  } catch { emit({ event: 'catalog.telemetry_unavailable' }); }
  process.exitCode = passed ? 0 : 1;
}
if (require.main === module) run().catch(() => { console.log('{"event":"catalog.public_failure"}'); process.exitCode = 1; });
