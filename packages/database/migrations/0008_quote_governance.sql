-- Sprint 8 / DD-028: customer-ready Quote governance.
-- Existing Draft quote history remains valid: new version-level governance fields are nullable
-- and become mandatory only at the READY domain gate.

ALTER TABLE quote_versions
  ADD COLUMN buyer_snapshot jsonb,
  ADD COLUMN tax_rate_bps integer,
  ADD COLUMN discount_reason text,
  ADD COLUMN discount_approved_by_user_id uuid REFERENCES users(id),
  ADD COLUMN discount_approved_at timestamptz,
  ADD CONSTRAINT quote_versions_tax_rate_bps_check
    CHECK (tax_rate_bps IS NULL OR (tax_rate_bps >= 0 AND tax_rate_bps <= 10000)),
  ADD CONSTRAINT quote_versions_discount_approval_pair_check
    CHECK (
      (discount_approved_by_user_id IS NULL AND discount_approved_at IS NULL)
      OR
      (discount_approved_by_user_id IS NOT NULL AND discount_approved_at IS NOT NULL)
    );

ALTER TABLE quotes
  ADD COLUMN ready_at timestamptz,
  ADD COLUMN sent_at timestamptz;
