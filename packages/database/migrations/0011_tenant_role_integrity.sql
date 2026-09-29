-- Roles may remain unassigned/unscoped, but a membership requires a role in its tenant.
-- Existing invalid rows abort validation and roll back this migration; never rewrite them.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE UNIQUE INDEX roles_id_org_uidx ON roles (id, organization_id);

ALTER TABLE organization_users
  ADD CONSTRAINT organization_users_role_tenant_fk
  FOREIGN KEY (role_id, organization_id)
  REFERENCES roles (id, organization_id)
  ON UPDATE NO ACTION ON DELETE NO ACTION
  NOT VALID;

ALTER TABLE organization_users
  VALIDATE CONSTRAINT organization_users_role_tenant_fk;
