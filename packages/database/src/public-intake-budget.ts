import type { Pool } from 'pg';

export interface PublicIntakeBudget {
  consume(organizationId: string, limit: number): Promise<boolean>;
}

export class PostgresPublicIntakeBudget implements PublicIntakeBudget {
  constructor(private readonly pool: Pool) {}

  async consume(organizationId: string, limit: number): Promise<boolean> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 10000) {
      throw new Error('Invalid public intake budget.');
    }
    // The conflict row lock makes checking and consuming one atomic operation.
    // Database time, not API instance clocks, defines a 60-second fixed window.
    // Rejected requests do not increase the counter or create additional rows.
    const result = await this.pool.query(
      `INSERT INTO public_intake_budgets (organization_id, window_started_at, used)
       VALUES ($1, statement_timestamp(), 1)
       ON CONFLICT (organization_id) DO UPDATE SET
         used = CASE
           WHEN public_intake_budgets.window_started_at <= statement_timestamp() - interval '60 seconds'
           THEN 1 ELSE public_intake_budgets.used + 1 END,
         window_started_at = CASE
           WHEN public_intake_budgets.window_started_at <= statement_timestamp() - interval '60 seconds'
           THEN statement_timestamp() ELSE public_intake_budgets.window_started_at END
       WHERE public_intake_budgets.used < $2
          OR public_intake_budgets.window_started_at <= statement_timestamp() - interval '60 seconds'
       RETURNING organization_id`,
      [organizationId, limit],
    );
    return result.rowCount === 1;
  }
}
