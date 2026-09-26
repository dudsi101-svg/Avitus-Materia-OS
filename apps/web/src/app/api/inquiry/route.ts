import { NextResponse } from 'next/server';
import { z } from 'zod';

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional().default(''),
  projectType: z.enum(['CUSTOM_FURNITURE', 'TABLE', 'INTERIOR', 'OLD_WOOD', 'OTHER']),
  message: z.string().trim().min(10).max(3000),
  companyWebsite: z.string().max(0).optional().default(''),
});

export async function POST(request: Request) {
  const parsed = inquirySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: 'Sprawdź dane formularza i spróbuj ponownie.' }, { status: 400 });
  }

  const apiUrl = process.env.AVITUS_API_URL;
  const apiKey = process.env.PUBLIC_INQUIRY_API_KEY;
  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { message: 'Formularz nie jest jeszcze podłączony do środowiska produkcyjnego.' },
      { status: 503 },
    );
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/public/inquiries`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-avitus-public-inquiry-key': apiKey,
      'x-correlation-id': crypto.randomUUID(),
    },
    body: JSON.stringify(parsed.data),
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ message: 'Nie udało się zapisać zapytania. Spróbuj ponownie za chwilę.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
