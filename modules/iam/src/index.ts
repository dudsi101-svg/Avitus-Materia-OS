import type { Database } from '@avitus/database';
import { organizationUsers, permissions, rolePermissions, roles, users } from '@avitus/database';
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
    const membership = await this.db
      .select({ userId: organizationUsers.userId })
      .from(organizationUsers)
      .innerJoin(users, eq(users.id, organizationUsers.userId))
      .where(
        and(
          eq(organizationUsers.userId, userId),
          eq(organizationUsers.organizationId, organizationId),
          eq(organizationUsers.status, 'ACTIVE'),
          eq(users.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!membership[0]) return null;

    const permissionRows = await this.db
      .select({ code: permissions.code })
      .from(organizationUsers)
      .innerJoin(roles, eq(roles.id, organizationUsers.roleId))
      .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(
        and(
          eq(organizationUsers.userId, userId),
          eq(organizationUsers.organizationId, organizationId),
          eq(organizationUsers.status, 'ACTIVE'),
        ),
      );
    return { userId, organizationId, permissions: new Set(permissionRows.map((row) => row.code)) };
  }
}
