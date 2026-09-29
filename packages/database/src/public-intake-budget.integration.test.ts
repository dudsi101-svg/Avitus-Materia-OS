import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgresPublicIntakeBudget } from './public-intake-budget';

const suite = process.env.DATABASE_URL ? describe : describe.skip;

suite('PostgreSQL public intake budget', () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const secondPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const first = new PostgresPublicIntakeBudget(pool);
  const second = new PostgresPublicIntakeBudget(secondPool);
  let org: string;
  let other: string;

  beforeAll(async () => { await pool.query('SELECT 1'); });
  beforeEach(async () => {
    org = randomUUID(); other = randomUUID();
    await pool.query("INSERT INTO organizations(id,name,slug) VALUES ($1,'Budget test',$2),($3,'Other budget test',$4)", [org, `budget-${org}`, other, `budget-${other}`]);
  });
  afterEach(async () => { await pool.query('DELETE FROM organizations WHERE id = ANY($1::uuid[])', [[org, other]]); });
  afterAll(async () => { await Promise.all([pool.end(), secondPool.end()]); });

  it('admits exactly the budget under concurrent requests across independent pools', async () => {
    const outcomes = await Promise.all(Array.from({ length: 40 }, (_, i) => (i % 2 ? first : second).consume(org, 7)));
    expect(outcomes.filter(Boolean)).toHaveLength(7);
    const result = await pool.query('SELECT used FROM public_intake_budgets WHERE organization_id = $1', [org]);
    expect(result.rows).toEqual([{ used: 7 }]);
    expect(await new PostgresPublicIntakeBudget(secondPool).consume(org, 7)).toBe(false);
    expect(await first.consume(other, 7)).toBe(true);
  });

  it('opens a fresh window without adding rows or inheriting exhausted capacity', async () => {
    expect(await first.consume(org, 1)).toBe(true);
    expect(await second.consume(org, 1)).toBe(false);
    await pool.query("UPDATE public_intake_budgets SET window_started_at = statement_timestamp() - interval '61 seconds' WHERE organization_id = $1", [org]);
    expect(await second.consume(org, 1)).toBe(true);
    expect(await first.consume(org, 1)).toBe(false);
    const result = await pool.query('SELECT used FROM public_intake_budgets WHERE organization_id = $1', [org]);
    expect(result.rows).toEqual([{ used: 1 }]);
  });

  it('rejects unknown organizations and invalid limits rather than creating unscoped state', async () => {
    await expect(first.consume(randomUUID(), 1)).rejects.toThrow();
    for (const limit of [0, -1, 1.5, 10001, NaN]) await expect(first.consume(org, limit)).rejects.toThrow();
    const result = await pool.query('SELECT used FROM public_intake_budgets WHERE organization_id = $1', [org]);
    expect(result.rows).toHaveLength(0);
  });
});
