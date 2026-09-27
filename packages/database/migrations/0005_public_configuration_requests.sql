CREATE TABLE public_configuration_requests (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  product_sku varchar(120) NOT NULL,
  product_name varchar(255) NOT NULL,
  option_values jsonb NOT NULL,
  configuration_status varchar(40) NOT NULL,
  readiness_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  name varchar(120) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(40),
  message text,
  source varchar(120) NOT NULL DEFAULT 'PUBLIC_CONFIGURATOR',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_configuration_requests_status_chk
    CHECK (configuration_status IN ('INCOMPLETE', 'READY_FOR_PRICING'))
);

CREATE INDEX public_configuration_requests_org_created_idx
  ON public_configuration_requests(organization_id, created_at);
CREATE INDEX public_configuration_requests_lead_idx
  ON public_configuration_requests(lead_id);
