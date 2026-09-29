import { NextResponse } from 'next/server';
import { z } from 'zod';
import { forwardPublicIntake } from '../../../lib/public-intake-proxy';

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

  return forwardPublicIntake('/public/inquiries', parsed.data);
}
