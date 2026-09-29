const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyCatalog } = require('./verify-catalog-capability.cjs');
const env = { AVITUS_API_URL: 'https://avitus-materia-api.fly.dev', PUBLIC_INQUIRY_API_KEY: 'private-key', PORT: '3001' };
const upstream = { ok: true, status: 200, json: async () => ({ products: [{ id: 'private-id' }] }) };
test('missing config and unapproved destinations never receive credentials', async () => {
  for (const input of [{}, { ...env, AVITUS_API_URL: 'https://other.invalid' }, { ...env, PUBLIC_INQUIRY_API_KEY: '' }]) {
    let calls = 0;
    assert.equal(await verifyCatalog(input, () => { calls++; throw Error('must not fetch'); }, () => {}), false);
    assert.equal(calls, 0);
  }
});
test('upstream auth failure reports status without reading/logging response body', async () => {
  const records = [];
  assert.equal(await verifyCatalog(env, async () => ({ ok: false, status: 401, json: () => { throw Error('must not read'); } }), x => records.push(x)), false);
  assert.equal(records.at(-1).status, 401);
  assert.doesNotMatch(JSON.stringify(records), /private-key/);
});
test('empty catalog cannot pass the capability check', async () => {
  assert.equal(await verifyCatalog(env, async () => ({ ...upstream, json: async () => ({ products: [] }) }), () => {}), false);
});
test('successful catalog plus rendered request form passes; secret only goes to API', async () => {
  let calls = 0; const records = [];
  const ok = await verifyCatalog(env, async (url, options) => {
    if (++calls === 1) { assert.equal(String(url), env.AVITUS_API_URL + '/public/configurator/products'); assert.equal(options.headers['x-avitus-public-inquiry-key'], env.PUBLIC_INQUIRY_API_KEY); return upstream; }
    assert.equal(options.headers, undefined);
    return { ok: true, status: 200, text: async () => '<form class="amRequestForm"></form>' };
  }, x => records.push(x));
  assert.equal(ok, true); assert.equal(calls, 2); assert.doesNotMatch(JSON.stringify(records), /private-key|private-id/);
});
test('HTTP 200 demo is a capability failure', async () => {
  let calls = 0;
  assert.equal(await verifyCatalog(env, async () => ++calls === 1 ? upstream : { ok: true, status: 200, text: async () => 'Ustalmy punkt startowy' }, () => {}), false);
});
test('network errors never log raw exception details', async () => {
  const records = [];
  assert.equal(await verifyCatalog(env, async () => { throw Error('private-key customer@example.org'); }, x => records.push(x)), false);
  assert.deepEqual(records.at(-1), { event: 'catalog.failure', stage: 'upstream' });
  assert.doesNotMatch(JSON.stringify(records), /private-key|customer@/);
});

test('documented private Fly API origin is explicitly allowed', async () => {
  let calls = 0;
  const input = { ...env, AVITUS_API_URL: 'http://avitus-materia-api.internal:4000' };
  await verifyCatalog(input, async (url, options) => {
    calls++; assert.equal(String(url), input.AVITUS_API_URL + '/public/configurator/products');
    assert.equal(options.headers['x-avitus-public-inquiry-key'], env.PUBLIC_INQUIRY_API_KEY);
    return { ...upstream, json: async () => ({ products: [] }) };
  }, () => {});
  assert.equal(calls, 1);
});
