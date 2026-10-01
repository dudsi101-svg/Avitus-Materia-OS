const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyPage, safeCatalogLogs, verifyWithRefresh } = require('./verify-public-configurator.cjs');
test('external capability requires actual form and rejects demo/error pages', async () => {
  for (const [status, html, expected] of [[200, '<form class="amRequestForm"></form>', true], [200, 'Ustalmy punkt startowy', false], [503, '<form class="amRequestForm"></form>', false]]) {
    assert.equal(await verifyPage('https://avitus-materia.com/kreator', async (_, options) => {
      assert.equal(options.headers, undefined); assert.equal(options.redirect, 'error');
      return { status, text: async () => html };
    }, () => {}), expected);
  }
});
test('only allowlisted telemetry fields survive untrusted surrounding logs', () => {
  const raw = 'private-user-data\n2026 info {"event":"web.catalog","reason":"upstream_http","status":401,"secret":"private-key","origin_kind":"fly_private"}\n{"event":"web.catalog","reason":"private-customer"}\n';
  assert.deepEqual(safeCatalogLogs(raw), [{ event: 'web.catalog', reason: 'upstream_http', origin_kind: 'fly_private', status: 401 }]);
  assert.doesNotMatch(JSON.stringify(safeCatalogLogs(raw)), /private-key|private-user|private-customer/);
});
test('network failure logs neither raw exceptions nor response body', async () => {
  const records = [];
  assert.equal(await verifyPage('https://avitus-materia.com/kreator', () => { throw Error('private'); }, r => records.push(r)), false);
  assert.doesNotMatch(JSON.stringify(records), /private/);
});

test('bounded GET-only refresh wait accepts a recovered page and stops on deadline', async () => {
  let clock = 0, calls = 0;
  const fetcher = async () => ({ status: 200, text: async () => ++calls <= 2 ? 'Ustalmy punkt startowy' : '<form class="amRequestForm"></form>' });
  assert.equal(await verifyWithRefresh(fetcher, () => {}, () => clock, async ms => { clock += ms; }, 60000), true);
  assert.equal(calls, 4); assert.equal(clock, 30000);
  clock = 0; calls = 0;
  assert.equal(await verifyWithRefresh(async () => { calls++; return { status: 503, text: async () => '' }; }, () => {}, () => clock, async ms => { clock += ms; }, 30000), false);
  assert.equal(calls, 4); assert.equal(clock, 30000);
});
