import { randomUUID } from 'node:crypto';
import { auditEvents, executorFrom, type DbExecutor } from '@avitus/database';
import type { ActorContext, TransactionContext } from '@avitus/shared';

export interface AuditEntry {
  organizationId: string;
  actor: ActorContext;
  entityType: string;
  entityId: string;
  action: string;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  reason?: string;
  correlationId: string;
}

export interface AuditStore {
  append(entry: AuditEntry, tx?: TransactionContext): Promise<void>;
}

export class PostgresAuditStore implements AuditStore {
  constructor(private readonly db: DbExecutor) {}

  async append(entry: AuditEntry, tx?: TransactionContext): Promise<void> {
    const executor = executorFrom(tx, this.db);
    await executor.insert(auditEvents).values({
      id: randomUUID(),
      organizationId: entry.organizationId,
      actorType: entry.actor.type,
      actorId: entry.actor.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      beforeData: entry.beforeData ?? null,
      afterData: entry.afterData ?? null,
      reason: entry.reason,
      correlationId: entry.correlationId,
    });
  }
}
