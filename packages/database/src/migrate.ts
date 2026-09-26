import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';

export async function migrate(connectionString = process.env.DATABASE_URL): Promise<void> {
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS _avitus_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const migrationDir = path.resolve(__dirname, '../migrations');
    const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const applied = await pool.query('SELECT 1 FROM _avitus_migrations WHERE name = $1', [file]);
      if (applied.rowCount) continue;
      const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _avitus_migrations(name) VALUES($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
