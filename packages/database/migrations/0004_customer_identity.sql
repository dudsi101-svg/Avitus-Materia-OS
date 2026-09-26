CREATE TYPE customer_account_type AS ENUM ('B2C','B2B','ARCHITECT','PARTNER','DEALER','OTHER');
CREATE TYPE customer_account_status AS ENUM ('PROSPECT','ACTIVE','VIP','DORMANT','AT_RISK','BLOCKED','ARCHIVED');
CREATE TYPE contact_point_type AS ENUM ('EMAIL','PHONE','WHATSAPP','OTHER');

-- Composite uniqueness gives link tables an enforceable organization boundary,
-- not only an application-level filter.
CREATE UNIQUE INDEX IF NOT EXISTS leads_org_id_uidx ON leads(organization_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS opportunities_org_id_uidx ON opportunities(organization_id, id);

CREATE TABLE persons (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name varchar(160) NOT NULL,
  last_name varchar(160) NOT NULL,
  display_name varchar(340) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, id)
);
CREATE INDEX persons_org_name_idx ON persons(organization_id, last_name, first_name);

CREATE TABLE companies (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  legal_name varchar(320) NOT NULL,
  display_name varchar(320) NOT NULL,
  tax_id varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, id)
);
CREATE INDEX companies_org_name_idx ON companies(organization_id, display_name);
CREATE INDEX companies_org_tax_id_idx ON companies(organization_id, tax_id);

CREATE TABLE customer_accounts (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_type customer_account_type NOT NULL,
  status customer_account_status NOT NULL DEFAULT 'PROSPECT',
  person_id uuid,
  company_id uuid,
  preferred_language varchar(12) NOT NULL DEFAULT 'pl',
  internal_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_accounts_exactly_one_subject CHECK (
    (person_id IS NOT NULL AND company_id IS NULL) OR
    (person_id IS NULL AND company_id IS NOT NULL)
  ),
  CONSTRAINT customer_accounts_person_org_fk
    FOREIGN KEY (organization_id, person_id) REFERENCES persons(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT customer_accounts_company_org_fk
    FOREIGN KEY (organization_id, company_id) REFERENCES companies(organization_id, id) ON DELETE RESTRICT,
  UNIQUE(person_id),
  UNIQUE(company_id),
  UNIQUE(organization_id, id)
);
CREATE INDEX customer_accounts_org_status_idx ON customer_accounts(organization_id, status);

CREATE TABLE contact_points (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_account_id uuid NOT NULL,
  contact_type contact_point_type NOT NULL,
  value varchar(500) NOT NULL,
  normalized_value varchar(500) NOT NULL,
  label varchar(120),
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_points_account_org_fk
    FOREIGN KEY (organization_id, customer_account_id)
    REFERENCES customer_accounts(organization_id, id) ON DELETE CASCADE,
  UNIQUE(customer_account_id, contact_type, normalized_value)
);
CREATE INDEX contact_points_org_lookup_idx ON contact_points(organization_id, contact_type, normalized_value);
CREATE UNIQUE INDEX contact_points_one_primary_per_type_uidx
  ON contact_points(customer_account_id, contact_type)
  WHERE is_primary;

CREATE TABLE lead_customer_accounts (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid PRIMARY KEY,
  customer_account_id uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_customer_accounts_lead_org_fk
    FOREIGN KEY (organization_id, lead_id) REFERENCES leads(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT lead_customer_accounts_account_org_fk
    FOREIGN KEY (organization_id, customer_account_id)
    REFERENCES customer_accounts(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX lead_customer_accounts_org_account_idx
  ON lead_customer_accounts(organization_id, customer_account_id);

CREATE TABLE opportunity_customer_accounts (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid PRIMARY KEY,
  customer_account_id uuid NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_customer_accounts_opportunity_org_fk
    FOREIGN KEY (organization_id, opportunity_id)
    REFERENCES opportunities(organization_id, id) ON DELETE CASCADE,
  CONSTRAINT opportunity_customer_accounts_account_org_fk
    FOREIGN KEY (organization_id, customer_account_id)
    REFERENCES customer_accounts(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX opportunity_customer_accounts_org_account_idx
  ON opportunity_customer_accounts(organization_id, customer_account_id);
