CREATE TYPE opportunity_status AS ENUM ('OPEN','DISCOVERY','SOLUTION_DEFINED','PRICING','PROPOSAL_SENT','NEGOTIATION','COMMIT','WON','LOST','ON_HOLD');
CREATE TYPE product_type AS ENUM ('STANDARD','CONFIGURABLE','CUSTOM','SERVICE');
CREATE TYPE product_option_data_type AS ENUM ('NUMBER','TEXT','ENUM','BOOLEAN');
CREATE TYPE configuration_status AS ENUM ('DRAFT','INCOMPLETE','READY_FOR_PRICING','PRICED','CUSTOMER_REVIEW','APPROVED','LOCKED','SUPERSEDED','ARCHIVED');

CREATE TABLE opportunities (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id),
  owner_user_id uuid REFERENCES users(id),
  title varchar(255) NOT NULL,
  description text,
  status opportunity_status NOT NULL DEFAULT 'OPEN',
  estimated_value numeric(19,4),
  currency varchar(3) NOT NULL DEFAULT 'PLN',
  probability integer NOT NULL DEFAULT 25 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date date,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX opportunities_org_status_idx ON opportunities(organization_id, status);
CREATE INDEX opportunities_org_lead_idx ON opportunities(organization_id, lead_id);

CREATE TABLE product_families (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  slug varchar(160) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, slug)
);

CREATE TABLE products (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_family_id uuid NOT NULL REFERENCES product_families(id),
  sku varchar(120) NOT NULL,
  name varchar(255) NOT NULL,
  slug varchar(160) NOT NULL,
  description text,
  product_type product_type NOT NULL,
  active boolean NOT NULL DEFAULT true,
  base_price numeric(19,4),
  default_currency varchar(3) NOT NULL DEFAULT 'PLN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, sku),
  UNIQUE(organization_id, slug)
);

CREATE TABLE product_option_definitions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code varchar(120) NOT NULL,
  name varchar(255) NOT NULL,
  data_type product_option_data_type NOT NULL,
  required boolean NOT NULL DEFAULT false,
  min_value numeric(19,4),
  max_value numeric(19,4),
  unit varchar(40),
  choices jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, code)
);

CREATE TABLE configurations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id),
  product_id uuid NOT NULL REFERENCES products(id),
  status configuration_status NOT NULL DEFAULT 'DRAFT',
  current_version integer NOT NULL DEFAULT 1 CHECK (current_version > 0),
  created_by_user_id uuid REFERENCES users(id),
  created_by_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX configurations_org_opportunity_idx ON configurations(organization_id, opportunity_id);
CREATE INDEX configurations_org_status_idx ON configurations(organization_id, status);

CREATE TABLE configuration_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configuration_id uuid NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  configuration_data jsonb NOT NULL,
  readiness_issues jsonb NOT NULL,
  created_by_user_id uuid REFERENCES users(id),
  created_by_ai boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(configuration_id, version_number)
);
CREATE INDEX configuration_versions_org_config_idx ON configuration_versions(organization_id, configuration_id);
