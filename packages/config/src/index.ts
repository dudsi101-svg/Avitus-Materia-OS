import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_MODE: z.enum(['development', 'external']).default('development'),
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  ADMIN_ORIGIN: z.string().url().default('http://localhost:3000'),
  PUBLIC_INQUIRY_ORGANIZATION_ID: z.string().uuid().optional(),
  PUBLIC_INQUIRY_API_KEY: z.string().min(24).optional(),
});

export type ServerConfig = z.infer<typeof serverSchema>;

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const config = serverSchema.parse(env);
  if (config.NODE_ENV === 'production' && config.AUTH_MODE === 'development') {
    throw new Error('Development authentication is forbidden in production.');
  }
  const inquiryPartiallyConfigured = Boolean(config.PUBLIC_INQUIRY_ORGANIZATION_ID) !== Boolean(config.PUBLIC_INQUIRY_API_KEY);
  if (inquiryPartiallyConfigured) {
    throw new Error('PUBLIC_INQUIRY_ORGANIZATION_ID and PUBLIC_INQUIRY_API_KEY must be configured together.');
  }
  return config;
}
