-- Customer-facing presentation of catalog options (DD-026): labels, descriptions, swatches, groups, slider step.
-- Validation rules stay in the typed columns; this column never changes what the Core accepts.
ALTER TABLE product_option_definitions ADD COLUMN presentation jsonb;
