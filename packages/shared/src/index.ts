import { randomUUID } from 'node:crypto';

export type ActorType = 'USER' | 'AI_AGENT' | 'SYSTEM' | 'INTEGRATION' | 'CUSTOMER' | 'PARTNER';

export interface ActorContext {
  type: ActorType;
  id: string;
}

export interface RequestContext {
  correlationId: string;
  organizationId: string;
  actor: ActorContext;
  permissions: ReadonlySet<string>;
}

export interface TransactionContext {
  readonly executor: unknown;
}

export interface UnitOfWork {
  run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  id: string;
  organizationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  eventVersion: number;
  payload: TPayload;
  occurredAt: Date;
  correlationId: string;
  causationId?: string;
  actor: ActorContext;
}

export function newDomainEvent<TPayload extends Record<string, unknown>>(
  input: Omit<DomainEvent<TPayload>, 'id' | 'occurredAt' | 'eventVersion'> & {
    eventVersion?: number;
  },
): DomainEvent<TPayload> {
  return {
    ...input,
    id: randomUUID(),
    occurredAt: new Date(),
    eventVersion: input.eventVersion ?? 1,
  };
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
