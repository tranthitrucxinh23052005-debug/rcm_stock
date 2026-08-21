ALTER TABLE stock_analyses
  ADD COLUMN IF NOT EXISTS forecast_metrics jsonb;
