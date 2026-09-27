import { randomUUID, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { ServerConfig } from '@avitus/config';
import type { RequestContext } from '@avitus/shared';
import type { AvitusRequest } from './request-context';

// Server-to-server trust boundary shared by all public-website routes (Sprint 3, DD-025).
// The organization is taken from server configuration only; the browser never supplies it.
export const PUBLIC_WEB_ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function secretsMatch(provided: string | undefined, expected: string): boolean {
  if (!provided) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}

export function publicWebContext(
  config: ServerConfig,
  request: AvitusRequest,
  permissions: string[],
): RequestContext {
  const organizationId = config.PUBLIC_INQUIRY_ORGANIZATION_ID;
  const expectedKey = config.PUBLIC_INQUIRY_API_KEY;
  if (!organizationId || !expectedKey) {
    throw new ServiceUnavailableException('Public website intake is not configured.');
  }
  if (!secretsMatch(request.header('x-avitus-public-inquiry-key'), expectedKey)) {
    throw new UnauthorizedException('Invalid public website credential.');
  }
  return {
    correlationId: request.correlationId ?? randomUUID(),
    organizationId,
    actor: { type: 'INTEGRATION', id: PUBLIC_WEB_ACTOR_ID },
    permissions: new Set(permissions),
  };
}
