import type { TransactionContext, UnitOfWork } from '@avitus/shared';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as coreSchema from './schema';
import * as acquisitionSchema from './acquisition-schema';

const schema = { ...coreSchema, ...acquisitionSchema };

export * from './schema';
export * from './acquisition-schema';

export type Database = NodePgDatabase<typeof schema>;
export type DbExecutor = Pick<Database, 'insert' | 'select' | 'update' | 'delete'>;

export interface DatabaseConnection {
  db: Database;
  pool: Pool;
}

export function createDatabase(connectionString: string): DatabaseConnection {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export function executorFrom(tx?: TransactionContext, fallback?: DbExecutor): DbExecutor {
  if (tx) return tx.executor as DbExecutor;
  if (fallback) return fallback;
  throw new Error('Database executor is required.');
}

export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Database) {}

  async run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async (transaction) => work({ executor: transaction as DbExecutor }));
  }
}
