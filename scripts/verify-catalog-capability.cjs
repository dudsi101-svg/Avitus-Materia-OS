// GET-only, no data/credential output. Run on the existing web machine.
async function verifyCatalog(env, fetcher, emit) {
  let originAllowed = false;
  try {
    const url = new URL(env.AVITUS_API_URL);
    originAllowed = ['https://avitus-materia-api.fly.dev', 'https://api.avitus-materia.com', 'http://avitus-materia-api.internal:4000'].includes(url.origin)
      && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash;
  } catch {}
  emit({ event: 'catalog.config', api_url_present: Boolean(env.AVITUS_API_URL), api_key_present: Boolean(env.PUBLIC_INQUIRY_API_KEY), origin_allowed: originAllowed });
  if (!originAllowed || !env.PUBLIC_INQUIRY_API_KEY) return false;
  let stage = 'upstream';
  try {
    const response = await fetcher(new URL('/public/configurator/products', env.AVITUS_API_URL), {
      headers: { 'x-avitus-public-inquiry-key': env.PUBLIC_INQUIRY_API_KEY, 'x-correlation-id': crypto.randomUUID() },
      cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) { emit({ event: 'catalog.upstream', status: response.status, ok: false }); return false; }
    const body = await response.json();
    const count = Array.isArray(body?.products) ? body.products.length : 0;
    emit({ event: 'catalog.upstream', status: response.status, products: count, ok: count > 0 });
    if (!count) return false;
    stage = 'page';
    const port = Number(env.PORT ?? 3001);
    if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
    const page = await fetcher(`http://127.0.0.1:${port}/kreator`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    const html = await page.text();
    const form = /<form\b[^>]*class="[^"]*\bamRequestForm\b/.test(html);
    const demo = html.includes('Ustalmy punkt startowy');
    const ok = page.ok && form && !demo;
    emit({ event: 'catalog.page', status: page.status, form, demo, ok });
    return ok;
  } catch {
    emit({ event: 'catalog.failure', stage });
    return false;
  }
}
module.exports = { verifyCatalog };
function run() {
  const timer = setTimeout(() => { console.log('{"event":"catalog.deadline"}'); process.exit(1); }, 25000);
  verifyCatalog(process.env, fetch, record => console.log(JSON.stringify(record)))
    .then(ok => { clearTimeout(timer); process.exitCode = ok ? 0 : 1; })
    .catch(() => { clearTimeout(timer); console.log('{"event":"catalog.failure","stage":"fatal"}'); process.exitCode = 1; });
}
if (require.main === module) run();
