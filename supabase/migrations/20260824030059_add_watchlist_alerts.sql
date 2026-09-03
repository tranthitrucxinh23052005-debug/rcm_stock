/*
# Add watchlist monitoring and alert history

1. Changes to `watchlist`
- `monitoring_interval` stores the refresh cadence: `1h` or `1d`.
- `alerts_enabled` controls whether this item is checked for alerts.
- `alert_threshold_pct` stores the minimum absolute price movement that triggers an alert.
- `last_checked_at` records the latest monitoring attempt.

2. New table `watchlist_alerts`
- Stores alert events for a ticker, including timeframe, trigger type, price, movement, and message.
- Prevents the interface from losing alert history between refreshes.

3. Security
- This app has no sign-in screen, so both tables intentionally allow anon and authenticated CRUD access.
- Row-level security is enabled and four separate CRUD policies are added to each table.

4. Notes
- The browser performs checks while the app is open. A future scheduled server job can reuse these durable settings for alerts while the browser is closed.
*/

ALTER TABLE watchlist
  ADD COLUMN IF NOT EXISTS monitoring_interval text NOT NULL DEFAULT '1h'
    CHECK (monitoring_interval IN ('1h', '1d')),
  ADD COLUMN IF NOT EXISTS alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_threshold_pct numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS watchlist_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlist(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  timeframe text NOT NULL CHECK (timeframe IN ('1h', '1d')),
  trigger_type text NOT NULL CHECK (trigger_type IN ('price_move', 'buy_signal', 'stop_loss', 'take_profit', 'trend_change')),
  price numeric NOT NULL,
  movement_pct numeric NOT NULL DEFAULT 0,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_alerts_watchlist_created
  ON watchlist_alerts(watchlist_id, created_at DESC);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_watchlist" ON watchlist;
CREATE POLICY "anon_select_watchlist" ON watchlist FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_watchlist" ON watchlist;
CREATE POLICY "anon_insert_watchlist" ON watchlist FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_watchlist" ON watchlist;
CREATE POLICY "anon_update_watchlist" ON watchlist FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_watchlist" ON watchlist;
CREATE POLICY "anon_delete_watchlist" ON watchlist FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_watchlist_alerts" ON watchlist_alerts;
CREATE POLICY "anon_select_watchlist_alerts" ON watchlist_alerts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_watchlist_alerts" ON watchlist_alerts;
CREATE POLICY "anon_insert_watchlist_alerts" ON watchlist_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_watchlist_alerts" ON watchlist_alerts;
CREATE POLICY "anon_update_watchlist_alerts" ON watchlist_alerts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_watchlist_alerts" ON watchlist_alerts;
CREATE POLICY "anon_delete_watchlist_alerts" ON watchlist_alerts FOR DELETE TO anon, authenticated USING (true);
