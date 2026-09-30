// Server-side only: reads the server-to-server credential. Never import from a client component.
import type { PublicProduct } from './configurator';

type CatalogReason = 'configuration_missing' | 'upstream_http' | 'invalid_payload' | 'empty_catalog' | 'available' | 'network_failure';
function originKind(value: string | undefined): string {
  try {
    const origin = new URL(value ?? '').origin;
    if (origin === 'http://avitus-materia-api.internal:4000') return 'fly_private';
    if (origin === 'https://avitus-materia-api.fly.dev') return 'fly_public';
    if (origin === 'https://api.avitus-materia.com') return 'public_api';
    return 'other';
  } catch { return 'invalid'; }
}

/** Loads the public configurator catalog; telemetry contains no URL, key, rows or raw errors. */
export async function loadConfiguratorProducts(): Promise<PublicProduct[] | null> {
  const apiUrl = process.env.AVITUS_API_URL;
  const apiKey = process.env.PUBLIC_INQUIRY_API_KEY;
  const record = (reason: CatalogReason, details: { status?: number; products?: number; code?: string } = {}) => {
    console.info(JSON.stringify({ event: 'web.catalog', reason, origin_kind: originKind(apiUrl),
      api_url_present: Boolean(apiUrl), api_key_present: Boolean(apiKey), ...details }));
  };
  if (!apiUrl || !apiKey) { record('configuration_missing'); return null; }
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/public/configurator/products`, {
      headers: { 'x-avitus-public-inquiry-key': apiKey, 'x-correlation-id': crypto.randomUUID() },
      next: { revalidate: 300 },
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) { record('upstream_http', { status: response.status }); return null; }
    let body: { products?: PublicProduct[] } | null;
    try { body = await response.json() as typeof body; }
    catch { record('invalid_payload'); return null; }
    if (!Array.isArray(body?.products)) { record('invalid_payload'); return null; }
    record(body.products.length ? 'available' : 'empty_catalog', { products: body.products.length });
    return body.products;
  } catch (error) {
    const cause = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
    const code = typeof cause === 'string' && ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(cause)
      ? cause : error instanceof Error && error.name === 'TimeoutError' ? 'TIMEOUT' : 'OTHER';
    record('network_failure', { code });
    return null;
  }
}
