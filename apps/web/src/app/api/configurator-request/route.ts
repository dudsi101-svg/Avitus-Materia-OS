import { NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  productId: z.string().uuid(),
  values: z.record(
    z.string().max(120),
    z.union([z.number().finite(), z.string().max(200), z.boolean()]),
  ),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().default(''),
  message: z.string().trim().max(3000).optional().default(''),
  companyWebsite: z.string().max(0).optional().default(''),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Sprawdź dane i spróbuj ponownie.' }, { status: 400 });
  }

  const apiUrl = process.env.AVITUS_API_URL;
  const apiKey = process.env.PUBLIC_INQUIRY_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { message: 'Kreator nie jest jeszcze podłączony do systemu.' },
      { status: 503 },
    );
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/public/configurator/requests`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-avitus-public-inquiry-key': apiKey,
      'x-correlation-id': crypto.randomUUID(),
    },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });

  if (response.status === 400) {
    return NextResponse.json(
      {
        message: 'Ta konfiguracja wykracza poza dostępne opcje. Zmień wartości i spróbuj ponownie.',
      },
      { status: 400 },
    );
  }
  if (!response.ok) {
    return NextResponse.json(
      { message: 'Nie udało się zapisać konfiguracji. Spróbuj ponownie za chwilę.' },
      { status: 502 },
    );
  }
  const body = (await response.json()) as { reference?: string };
  return NextResponse.json({ ok: true, reference: body.reference }, { status: 201 });
}
