CREATE TABLE public_inquiry_submissions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(40),
  project_type varchar(80) NOT NULL,
  message text NOT NULL,
  source varchar(120) NOT NULL DEFAULT 'PUBLIC_WEB',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX public_inquiry_submissions_org_created_idx
  ON public_inquiry_submissions(organization_id, created_at);
CREATE INDEX public_inquiry_submissions_lead_idx
  ON public_inquiry_submissions(lead_id);
