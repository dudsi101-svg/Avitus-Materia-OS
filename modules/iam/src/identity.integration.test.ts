import { randomUUID } from 'node:crypto';
import { createDatabase } from '@avitus/database';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PostgresIdentityRepository } from './index';

const suite = process.env.DATABASE_URL ? describe : describe.skip;
suite('tenant membership authorization', () => {
  const { db, pool } = createDatabase(process.env.DATABASE_URL ?? '');
  const repository = new PostgresIdentityRepository(db);
  let org: string, other: string, user: string, member: string;
  let role: string, foreignRole: string, globalRole: string, permission: string;
  beforeEach(async () => {
    [org, other, user, member, role, foreignRole, globalRole, permission] = Array.from({ length: 8 }, () => randomUUID()) as [string,string,string,string,string,string,string,string];
    await pool.query("INSERT INTO organizations(id,name,slug) VALUES($1,'IAM test',$3),($2,'IAM other',$4)", [org, other, `iam-${org}`, `iam-${other}`]);
    await pool.query("INSERT INTO users(id,auth_provider_id,email) VALUES($1,$2,'iam@example.invalid')", [user, `iam-${user}`]);
    await pool.query("INSERT INTO roles(id,organization_id,code,name) VALUES($1,$2,'SALES','Sales'),($3,$4,'OWNER','Other owner'),($5,NULL,'GLOBAL','Unscoped')", [role, org, foreignRole, other, globalRole]);
    await pool.query("INSERT INTO permissions(id,code) VALUES($1,$2)", [permission, `iam.test.${permission}`]);
    await pool.query('INSERT INTO role_permissions(role_id,permission_id) VALUES($1,$4),($2,$4),($3,$4)', [role, foreignRole, globalRole, permission]);
    await pool.query('INSERT INTO organization_users(id,organization_id,user_id,role_id) VALUES($1,$2,$3,$4)', [member, org, user, role]);
  });
  afterEach(async () => {
    await pool.query('DELETE FROM organization_users WHERE id=$1', [member]);
    await pool.query('DELETE FROM roles WHERE id=ANY($1::uuid[])', [[role, foreignRole, globalRole]]);
    await pool.query('DELETE FROM permissions WHERE id=$1', [permission]);
    await pool.query('DELETE FROM users WHERE id=$1', [user]);
    await pool.query('DELETE FROM organizations WHERE id=ANY($1::uuid[])', [[org, other]]);
  });
  afterAll(async () => { await pool.end(); });
  it('grants only the active membership in its own tenant', async () => {
    const result = await repository.authorizeMembership(user, org);
    expect(result?.organizationId).toBe(org);
    expect([...result!.permissions]).toEqual([`iam.test.${permission}`]);
    expect(await repository.authorizeMembership(user, other)).toBeNull();
    expect(await repository.authorizeMembership(randomUUID(), org)).toBeNull();
  });
  it('denies a foreign tenant role even though the legacy FK permits it', async () => {
    await pool.query('UPDATE organization_users SET role_id=$1 WHERE id=$2', [foreignRole, member]);
    expect(await repository.authorizeMembership(user, org)).toBeNull();
  });
  it('does not turn an unscoped role into an implicit global grant', async () => {
    await pool.query('UPDATE organization_users SET role_id=$1 WHERE id=$2', [globalRole, member]);
    expect(await repository.authorizeMembership(user, org)).toBeNull();
  });
  it('preserves an active membership with no permissions', async () => {
    await pool.query('DELETE FROM role_permissions WHERE role_id=$1', [role]);
    const result = await repository.authorizeMembership(user, org);
    expect(result).not.toBeNull();
    expect(result!.permissions.size).toBe(0);
  });
  it.each(['user', 'membership', 'organization'] as const)('denies a suspended %s', async (entity) => {
    const statements = {
      user: ["UPDATE users SET status='SUSPENDED' WHERE id=$1", user],
      membership: ["UPDATE organization_users SET status='SUSPENDED' WHERE id=$1", member],
      organization: ["UPDATE organizations SET status='SUSPENDED' WHERE id=$1", org],
    } as const;
    const [sql, id] = statements[entity];
    await pool.query(sql, [id]);
    expect(await repository.authorizeMembership(user, org)).toBeNull();
  });
});
