-- Sprint 6 (DD-027): a public configuration request can be converted once into Opportunity + Configuration.
-- The primary key on request_id makes conversion one-time even under concurrent clicks.
CREATE TABLE public_configuration_request_conversions (
  request_id uuid PRIMARY KEY REFERENCES public_configuration_requests(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id),
  configuration_id uuid NOT NULL REFERENCES configurations(id),
  converted_by_actor_type varchar(40) NOT NULL,
  converted_by_actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX public_configuration_request_conversions_org_idx
  ON public_configuration_request_conversions(organization_id, created_at);
