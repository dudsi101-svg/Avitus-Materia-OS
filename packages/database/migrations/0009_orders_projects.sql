CREATE TYPE order_status AS ENUM ('CONFIRMED', 'ON_HOLD', 'CANCELLED', 'COMPLETED');
CREATE TYPE project_status AS ENUM ('PLANNING', 'READY', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

CREATE TABLE quote_acceptances (
  quote_id uuid PRIMARY KEY REFERENCES quotes(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_version_number integer NOT NULL,
  accepted_at timestamptz NOT NULL,
  accepted_by_actor_type varchar(40) NOT NULL,
  accepted_by_actor_id uuid NOT NULL
);

CREATE INDEX quote_acceptances_org_idx ON quote_acceptances(organization_id, accepted_at);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number varchar(80) NOT NULL,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
  quote_version_number integer NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE RESTRICT,
  customer_account_id uuid NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  configuration_id uuid NOT NULL REFERENCES configurations(id) ON DELETE RESTRICT,
  currency varchar(3) NOT NULL,
  subtotal numeric(19,4) NOT NULL,
  discount_amount numeric(19,4) NOT NULL,
  tax_amount numeric(19,4) NOT NULL,
  total numeric(19,4) NOT NULL,
  estimated_cost numeric(19,4) NOT NULL,
  margin_amount numeric(19,4) NOT NULL,
  margin_bps integer NOT NULL,
  buyer_snapshot jsonb NOT NULL,
  status order_status NOT NULL DEFAULT 'CONFIRMED',
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX orders_org_number_uidx ON orders(organization_id, order_number);
CREATE UNIQUE INDEX orders_org_quote_uidx ON orders(organization_id, quote_id);
CREATE INDEX orders_org_customer_idx ON orders(organization_id, customer_account_id);

CREATE TABLE projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  configuration_id uuid NOT NULL REFERENCES configurations(id) ON DELETE RESTRICT,
  name varchar(255) NOT NULL,
  status project_status NOT NULL DEFAULT 'PLANNING',
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX projects_org_order_uidx ON projects(organization_id, order_id);
CREATE INDEX projects_org_status_idx ON projects(organization_id, status);
