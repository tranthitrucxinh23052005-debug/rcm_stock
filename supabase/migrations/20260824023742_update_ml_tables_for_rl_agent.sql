-- Migrate ML prediction tables from Supervised (linear regression) to Reinforcement Learning (RL Agent)

-- Add RL-specific columns to ml_predictions
ALTER TABLE ml_predictions
  ADD COLUMN IF NOT EXISTS action integer,           -- 0=Hold, 1=Buy
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS take_profit_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss_price numeric,
  ADD COLUMN IF NOT EXISTS episode_reward numeric,   -- +10 TP, -10 SL, 0 Hold
  ADD COLUMN IF NOT EXISTS outcome text;             -- 'TP', 'SL', 'HOLD', 'EXPIRED'

-- Rename columns to RL terminology
ALTER TABLE ml_predictions
  RENAME COLUMN reward_penalty TO cumulative_reward_delta;
ALTER TABLE ml_predictions
  RENAME COLUMN prediction_error TO prediction_error_pct;

-- Add RL-specific columns to ml_model_state
ALTER TABLE ml_model_state
  ADD COLUMN IF NOT EXISTS window_size integer NOT NULL DEFAULT 100,    -- Walk-Forward window
  ADD COLUMN IF NOT EXISTS epsilon numeric NOT NULL DEFAULT 0.1,        -- Exploration rate
  ADD COLUMN IF NOT EXISTS episodes integer NOT NULL DEFAULT 0,         -- Total episodes
  ADD COLUMN IF NOT EXISTS episode_rewards integer NOT NULL DEFAULT 0,  -- Sum of episode rewards
  ADD COLUMN IF NOT EXISTS episode_accuracy numeric NOT NULL DEFAULT 0;  -- % of profitable episodes

-- Add index for walk-forward lookups
CREATE INDEX IF NOT EXISTS idx_ml_predictions_ticker_unassessed
  ON ml_predictions(ticker, predicted_at) WHERE evaluated = false;
