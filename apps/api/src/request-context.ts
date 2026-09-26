import { randomUUID } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  NestMiddleware,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { IdentityRepository } from '@avitus/iam';
import type { RequestContext, ActorContext } from '@avitus/shared';
import type { ServerConfig } from '@avitus/config';
import { z } from 'zod';
import { TOKENS } from './tokens';

export interface AvitusRequest extends Request {
  avitusContext?: RequestContext;
  correlationId?: string;
}

const PUBLIC_ROUTE_KEY = 'avitus:public-route';
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: AvitusRequest, res: Response, next: () => void): void {
    const incoming = req.header('x-correlation-id');
    const correlationId = incoming && z.string().uuid().safeParse(incoming).success ? incoming : randomUUID();
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
  }
}

@Injectable()
export class DevelopmentAuthGuard implements CanActivate {
  constructor(
    @Inject(TOKENS.config) private readonly config: ServerConfig,
    @Inject(TOKENS.identityRepository) private readonly identity: IdentityRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AvitusRequest>();
    if (request.path === '/health' || request.path === '/ready') return true;
    if (this.config.AUTH_MODE !== 'development') {
      throw new UnauthorizedException('External identity adapter is not configured yet.');
    }
    const userId = request.header('x-avitus-user-id');
    const organizationId = request.header('x-avitus-organization-id');
    const ids = z.object({ userId: z.string().uuid(), organizationId: z.string().uuid() }).safeParse({
      userId,
      organizationId,
    });
    if (!ids.success) throw new UnauthorizedException('Missing or invalid development auth headers.');
    const membership = await this.identity.authorizeMembership(ids.data.userId, ids.data.organizationId);
    if (!membership) throw new UnauthorizedException('User is not an active member of this organization.');
    const actor: ActorContext = { type: 'USER', id: ids.data.userId };
    request.avitusContext = {
      correlationId: request.correlationId ?? randomUUID(),
      organizationId: ids.data.organizationId,
      actor,
      permissions: membership.permissions,
    };
    return true;
  }
}

export function requireContext(request: AvitusRequest): RequestContext {
  if (!request.avitusContext) throw new UnauthorizedException('Request context unavailable.');
  return request.avitusContext;
}
