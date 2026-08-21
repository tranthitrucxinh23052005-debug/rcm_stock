-- ML prediction tracking tables for self-learning forecast system

-- Stores each prediction made, used to evaluate accuracy when actual data arrives
CREATE TABLE IF NOT EXISTS ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  predicted_at timestamptz NOT NULL DEFAULT now(),
  forecast_days integer NOT NULL,
  predicted_return_pct numeric NOT NULL,
  predicted_direction text NOT NULL, -- 'UP' or 'DOWN'
  stop_loss_pct numeric NOT NULL,
  take_profit_pct numeric NOT NULL,
  confidence numeric NOT NULL,
  features jsonb NOT NULL,
  model_weights jsonb NOT NULL,
  evaluated boolean NOT NULL DEFAULT false,
  actual_return_pct numeric,
  prediction_error numeric,
  reward_penalty numeric, -- positive = reward (correct), negative = penalty (wrong)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_ticker ON ml_predictions(ticker);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_evaluated ON ml_predictions(evaluated) WHERE evaluated = false;
CREATE INDEX IF NOT EXISTS idx_ml_predictions_predicted_at ON ml_predictions(predicted_at DESC);

ALTER TABLE ml_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_ml_predictions" ON ml_predictions;
CREATE POLICY "anon_select_ml_predictions" ON ml_predictions FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_ml_predictions" ON ml_predictions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_ml_predictions" ON ml_predictions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_ml_predictions" ON ml_predictions FOR DELETE
  TO anon, authenticated USING (true);

-- Stores the learned model state per ticker (weights get updated each run)
CREATE TABLE IF NOT EXISTS ml_model_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker text NOT NULL,
  weights jsonb NOT NULL,
  bias numeric NOT NULL DEFAULT 0,
  learning_rate numeric NOT NULL DEFAULT 0.01,
  total_predictions integer NOT NULL DEFAULT 0,
  correct_predictions integer NOT NULL DEFAULT 0,
  cumulative_reward numeric NOT NULL DEFAULT 0,
  avg_error numeric NOT NULL DEFAULT 0,
  last_trained_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(ticker)
);

ALTER TABLE ml_model_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_ml_model_state" ON ml_model_state;
CREATE POLICY "anon_select_ml_model_state" ON ml_model_state FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_ml_model_state" ON ml_model_state FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_ml_model_state" ON ml_model_state FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_ml_model_state" ON ml_model_state FOR DELETE
  TO anon, authenticated USING (true);
