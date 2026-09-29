-- One bounded, non-PII counter per organization, shared across API instances.
-- Additive: rollback application code without dropping this table.
CREATE TABLE public_intake_budgets (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL,
  used integer NOT NULL CHECK (used > 0)
);
