import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardPublicIntake } from './public-intake-proxy';
import { POST as inquiry } from '../app/api/inquiry/route';
import { POST as configuration } from '../app/api/configurator-request/route';

const reference = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const secret = 'test-server-key-never-for-the-browser';
const fetchMock = vi.fn();
const paths = ['/public/inquiries', '/public/configurator/requests'] as const;

describe('Public intake proxy', () => {
  beforeEach(() => {
    vi.stubEnv('AVITUS_API_URL', 'https://api.example.invalid/');
    vi.stubEnv('PUBLIC_INQUIRY_API_KEY', secret);
    fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('preserves 429 and bounded retry guidance on both paths without leaking upstream data', async () => {
    for (const path of paths) {
      fetchMock.mockResolvedValueOnce(new Response(secret, { status: 429, headers: { 'Retry-After': 'untrusted-value' } }));
      const response = await forwardPublicIntake(path, {});
      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).not.toContain(secret);
    }
  });

  it('sets a timeout, correlates success and forwards the credential only to the server', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    fetchMock.mockResolvedValueOnce(Response.json({ ok: true, reference, privateData: secret }));
    const response = await forwardPublicIntake('/public/inquiries', { name: 'Test' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, reference });
    expect(timeout).toHaveBeenCalledWith(8000);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.example.invalid/public/inquiries');
    expect(options.headers['x-avitus-public-inquiry-key']).toBe(secret);
    expect(options.headers['x-correlation-id']).toBe(response.headers.get('x-correlation-id'));
    expect(response.headers.get('x-avitus-public-inquiry-key')).toBeNull();
  });

  it('does not retry an ambiguous network failure or expose its details', async () => {
    fetchMock.mockRejectedValue(new Error(`${secret} customer@example.com`));
    const response = await forwardPublicIntake('/public/inquiries', {});
    expect(response.status).toBe(504);
    const body = await response.json();
    expect(body.message).toContain('mogło zostać zapisane');
    expect(JSON.stringify(body)).not.toContain(secret);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed for missing configuration, upstream errors and malformed acknowledgement', async () => {
    vi.stubEnv('PUBLIC_INQUIRY_API_KEY', '');
    expect((await forwardPublicIntake('/public/inquiries', {})).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv('PUBLIC_INQUIRY_API_KEY', secret);
    for (const upstream of [new Response(secret, { status: 500 }), Response.json({ ok: true }), Response.json({ reference: secret })]) {
      fetchMock.mockResolvedValueOnce(upstream);
      const response = await forwardPublicIntake('/public/inquiries', {});
      expect(response.status).toBe(502);
      expect(await response.text()).not.toContain(secret);
    }
  });

  it('wires both validated route handlers to the protected proxy and rejects invalid input locally', async () => {
    const input = { name: 'Test Visitor', email: 'test@example.com', projectType: 'TABLE', message: 'Test inquiry message', productId: reference, values: {} };
    for (const handler of [inquiry, configuration]) {
      fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }));
      expect((await handler(new Request('https://web.example.invalid/api', { method: 'POST', body: JSON.stringify(input) }))).status).toBe(429);
      const previous = fetchMock.mock.calls.length;
      expect((await handler(new Request('https://web.example.invalid/api', { method: 'POST', body: '{}' }))).status).toBe(400);
      expect(fetchMock).toHaveBeenCalledTimes(previous);
    }
  });
});
