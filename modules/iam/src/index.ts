import type { Database } from '@avitus/database';
import { organizations, organizationUsers, permissions, rolePermissions, roles, users } from '@avitus/database';
import { and, eq } from 'drizzle-orm';

export interface MembershipAuthorization {
  userId: string;
  organizationId: string;
  permissions: ReadonlySet<string>;
}

export interface IdentityRepository {
  authorizeMembership(userId: string, organizationId: string): Promise<MembershipAuthorization | null>;
}

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private readonly db: Database) {}

  async authorizeMembership(userId: string, organizationId: string): Promise<MembershipAuthorization | null> {
    // Resolve identity, tenant, role and permissions in one statement snapshot.
    // Unscoped roles are not implicitly global grants: roles belong to a tenant.
    const rows = await this.db
      .select({ userId: organizationUsers.userId, code: permissions.code })
      .from(organizationUsers)
      .innerJoin(users, eq(users.id, organizationUsers.userId))
      .innerJoin(organizations, eq(organizations.id, organizationUsers.organizationId))
      .innerJoin(roles, and(
        eq(roles.id, organizationUsers.roleId),
        eq(roles.organizationId, organizationUsers.organizationId),
      ))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .leftJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.organizationId, organizationId),
        eq(organizationUsers.status, 'ACTIVE'),
        eq(users.status, 'ACTIVE'),
        eq(organizations.status, 'ACTIVE'),
      ));
    if (!rows[0]) return null;
    return { userId, organizationId, permissions: new Set(rows.flatMap((row) => row.code === null ? [] : [row.code])) };
  }
}
