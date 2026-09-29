import { NextResponse } from 'next/server';
import { z } from 'zod';
import { forwardPublicIntake } from '../../../lib/public-intake-proxy';

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

  return forwardPublicIntake('/public/configurator/requests', parsed.data);
}
