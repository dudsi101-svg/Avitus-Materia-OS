import { randomUUID } from 'node:crypto';
import { domainEvents, executorFrom, outboxEvents, type DbExecutor } from '@avitus/database';
import type { DomainEvent, TransactionContext } from '@avitus/shared';

export interface DomainEventStore {
  append(event: DomainEvent, tx?: TransactionContext): Promise<void>;
}

export class PostgresDomainEventStore implements DomainEventStore {
  constructor(private readonly db: DbExecutor) {}

  async append(event: DomainEvent, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(domainEvents).values({
      id: event.id,
      organizationId: event.organizationId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      eventVersion: event.eventVersion,
      payload: event.payload,
      occurredAt: event.occurredAt,
      correlationId: event.correlationId,
      causationId: event.causationId,
      actorType: event.actor.type,
      actorId: event.actor.id,
    });
    await executor.insert(outboxEvents).values({
      id: randomUUID(),
      domainEventId: event.id,
      topic: event.eventType,
      payload: {
        eventId: event.id,
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventVersion: event.eventVersion,
        organizationId: event.organizationId,
        correlationId: event.correlationId,
        payload: event.payload,
      },
    });
  }
}
