import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadConfiguratorProducts } from './public-api';
const secret = 'private-key';
const fetchMock = vi.fn();
let messages: string[];
beforeEach(() => {
  vi.stubEnv('AVITUS_API_URL', 'http://avitus-materia-api.internal:4000');
  vi.stubEnv('PUBLIC_INQUIRY_API_KEY', secret);
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  messages = []; vi.spyOn(console, 'info').mockImplementation((value: string) => messages.push(value));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it('reports missing configuration without attempting a request or exposing credentials', async () => {
  vi.stubEnv('AVITUS_API_URL', '');
  expect(await loadConfiguratorProducts()).toBeNull(); expect(fetchMock).not.toHaveBeenCalled();
  expect(JSON.parse(messages[0]!)).toMatchObject({ reason: 'configuration_missing', api_url_present: false, api_key_present: true });
  expect(messages.join()).not.toContain(secret);
});
it('records auth status without reading a potentially sensitive error body', async () => {
  fetchMock.mockResolvedValue(new Response('private-customer-data', { status: 401 }));
  expect(await loadConfiguratorProducts()).toBeNull();
  expect(JSON.parse(messages[0]!)).toMatchObject({ reason: 'upstream_http', status: 401, origin_kind: 'fly_private' });
  expect(messages.join()).not.toMatch(/private-key|private-customer-data|internal:4000/);
});
it('distinguishes empty and malformed catalogs', async () => {
  for (const response of [Response.json(null), Response.json({}), new Response('broken')]) {
    fetchMock.mockResolvedValueOnce(response); expect(await loadConfiguratorProducts()).toBeNull();
    expect(JSON.parse(messages.at(-1)!)).toMatchObject({ reason: 'invalid_payload' });
  }
  fetchMock.mockResolvedValueOnce(Response.json({ products: [] }));
  expect(await loadConfiguratorProducts()).toEqual([]);
  expect(JSON.parse(messages.at(-1)!)).toMatchObject({ reason: 'empty_catalog' });
});
it('returns catalog but logs only its count and refuses credential-bearing redirects', async () => {
  const products = [{ id: 'private-product-id' }];
  fetchMock.mockResolvedValue(Response.json({ products }));
  expect(await loadConfiguratorProducts()).toEqual(products);
  expect(JSON.parse(messages[0]!)).toMatchObject({ reason: 'available', products: 1 });
  expect(messages.join()).not.toContain('private-product-id');
  expect(fetchMock.mock.calls[0]![1]).toMatchObject({ redirect: 'error', next: { revalidate: 300 } });
});
it('classifies network failures without raw exception, URL or arbitrary code leakage', async () => {
  for (const code of ['ENOTFOUND', 'private-value']) {
    fetchMock.mockRejectedValueOnce(Object.assign(Error('private-key customer@example.com'), { cause: { code } }));
    expect(await loadConfiguratorProducts()).toBeNull();
    expect(JSON.parse(messages.at(-1)!)).toMatchObject({ reason: 'network_failure', code: code === 'ENOTFOUND' ? code : 'OTHER' });
  }
  expect(messages.join()).not.toMatch(/private-key|private-value|customer@/);
});
