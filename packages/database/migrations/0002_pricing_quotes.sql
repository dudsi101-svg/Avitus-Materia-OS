CREATE TYPE cost_component_type AS ENUM ('MATERIAL','LABOR','MACHINE','OUTSOURCING','TRANSPORT','PACKAGING','FINISH','OTHER');
CREATE TYPE quote_status AS ENUM ('DRAFT','INTERNAL_REVIEW','READY','SENT','VIEWED','NEGOTIATION','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN','REVISION_REQUIRED','SUPERSEDED');

CREATE TABLE price_calculations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id uuid NOT NULL REFERENCES configurations(id),
  configuration_version_id uuid NOT NULL REFERENCES configuration_versions(id),
  configuration_version_number integer NOT NULL CHECK (configuration_version_number > 0),
  currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  algorithm_version varchar(120) NOT NULL,
  target_margin_bps integer NOT NULL CHECK (target_margin_bps >= 0 AND target_margin_bps < 10000),
  total_cost numeric(19,4) NOT NULL CHECK (total_cost >= 0),
  recommended_price numeric(19,4) NOT NULL CHECK (recommended_price >= total_cost),
  input_snapshot jsonb NOT NULL,
  output_snapshot jsonb NOT NULL,
  created_by_user_id uuid REFERENCES users(id),
  created_by_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX price_calculations_org_config_version_idx ON price_calculations(organization_id, configuration_id, configuration_version_number);
CREATE INDEX price_calculations_org_created_idx ON price_calculations(organization_id, created_at);

CREATE TABLE cost_components (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  price_calculation_id uuid NOT NULL REFERENCES price_calculations(id) ON DELETE CASCADE,
  component_type cost_component_type NOT NULL,
  label varchar(255) NOT NULL,
  amount numeric(19,4) NOT NULL CHECK (amount >= 0),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cost_components_org_calculation_idx ON cost_components(organization_id, price_calculation_id);

CREATE TABLE quotes (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id),
  configuration_id uuid NOT NULL REFERENCES configurations(id),
  quote_number varchar(80) NOT NULL,
  status quote_status NOT NULL DEFAULT 'DRAFT',
  currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  created_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, quote_number)
);
CREATE INDEX quotes_org_opportunity_idx ON quotes(organization_id, opportunity_id);
CREATE INDEX quotes_org_status_idx ON quotes(organization_id, status);

CREATE TABLE quote_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  price_calculation_id uuid NOT NULL REFERENCES price_calculations(id),
  configuration_version_number integer NOT NULL CHECK (configuration_version_number > 0),
  subtotal numeric(19,4) NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric(19,4) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount numeric(19,4) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total numeric(19,4) NOT NULL CHECK (total >= 0),
  estimated_cost numeric(19,4) NOT NULL CHECK (estimated_cost >= 0),
  margin_amount numeric(19,4) NOT NULL,
  margin_bps integer NOT NULL CHECK (margin_bps >= 0 AND margin_bps < 10000),
  pricing_snapshot jsonb NOT NULL,
  reason text,
  valid_until date,
  created_by_user_id uuid REFERENCES users(id),
  created_by_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quote_id, version_number)
);
CREATE INDEX quote_versions_org_quote_idx ON quote_versions(organization_id, quote_id);

CREATE TABLE quote_items (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quote_version_id uuid NOT NULL REFERENCES quote_versions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  configuration_id uuid NOT NULL REFERENCES configurations(id),
  description varchar(500) NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(19,4) NOT NULL CHECK (unit_price >= 0),
  line_total numeric(19,4) NOT NULL CHECK (line_total >= 0),
  estimated_cost numeric(19,4) NOT NULL CHECK (estimated_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quote_items_org_version_idx ON quote_items(organization_id, quote_version_id);
