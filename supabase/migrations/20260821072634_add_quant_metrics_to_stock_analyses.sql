ALTER TABLE stock_analyses
  ADD COLUMN IF NOT EXISTS quant_metrics jsonb;
