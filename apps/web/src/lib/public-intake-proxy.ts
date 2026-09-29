import { NextResponse } from 'next/server';

type IntakePath = '/public/inquiries' | '/public/configurator/requests';

// Server-only credential use. Never import this helper from a client component.
export async function forwardPublicIntake(path: IntakePath, data: unknown): Promise<Response> {
  const correlationId = crypto.randomUUID();
  const headers = { 'x-correlation-id': correlationId, 'cache-control': 'no-store' };
  const apiUrl = process.env.AVITUS_API_URL;
  const apiKey = process.env.PUBLIC_INQUIRY_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json({ message: 'Formularz jest chwilowo niedostępny. Skontaktuj się z nami.' }, { status: 503, headers });
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-avitus-public-inquiry-key': apiKey,
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify(data),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 429) {
      return NextResponse.json(
        { message: 'Zbyt wiele zgłoszeń. Spróbuj ponownie za minutę.' },
        { status: 429, headers: { ...headers, 'Retry-After': '60' } },
      );
    }
    if (response.status === 400) {
      return NextResponse.json({ message: 'Sprawdź dane i dostępne opcje konfiguracji.' }, { status: 400, headers });
    }
    if (!response.ok) {
      return NextResponse.json({ message: 'Nie udało się potwierdzić zapisu zgłoszenia. Skontaktuj się z nami.' }, { status: 502, headers });
    }
    const body = await response.json() as { reference?: unknown };
    if (typeof body.reference !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.reference)) {
      return NextResponse.json({ message: 'Nie udało się potwierdzić zapisu zgłoszenia. Skontaktuj się z nami.' }, { status: 502, headers });
    }
    return NextResponse.json({ ok: true, reference: body.reference }, { status: 201, headers });
  } catch {
    // A timeout is ambiguous: the upstream transaction may already have committed.
    // Never retry automatically or claim that nothing was saved.
    return NextResponse.json(
      { message: 'Nie otrzymaliśmy potwierdzenia zapisu. Zgłoszenie mogło zostać zapisane — skontaktuj się z nami przed ponowną wysyłką.' },
      { status: 504, headers },
    );
  }
}
