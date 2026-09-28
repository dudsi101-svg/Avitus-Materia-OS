// Server-side only: reads the server-to-server credential. Never import from a client component.
import type { PublicProduct } from './configurator';

/** Loads the public configurator catalog on the server. Returns null when the API is unavailable. */
export async function loadConfiguratorProducts(): Promise<PublicProduct[] | null> {
  const apiUrl = process.env.AVITUS_API_URL;
  const apiKey = process.env.PUBLIC_INQUIRY_API_KEY;
  if (!apiUrl || !apiKey) return null;
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/public/configurator/products`, {
      headers: { 'x-avitus-public-inquiry-key': apiKey, 'x-correlation-id': crypto.randomUUID() },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { products?: PublicProduct[] };
    return Array.isArray(body.products) ? body.products : null;
  } catch {
    return null;
  }
}
