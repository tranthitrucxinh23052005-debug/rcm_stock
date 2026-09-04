import { useState, useEffect, useCallback } from 'react';
import { LineChart, TrendingUp, Sun, Moon, Printer } from 'lucide-react';
import { supabase, EDGE_FUNCTION_URL } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { AnalyzeResponse, StockAnalysisRecord, WatchlistAlert, WatchlistItem } from '@/types';
import StockSearch from '@/components/StockSearch';
import MetricsPanel from '@/components/MetricsPanel';
import QuantPanel from '@/components/QuantPanel';
import ForecastPanel from '@/components/ForecastPanel';
import AnalysisResultPanel from '@/components/AnalysisResultPanel';
import HistoryPanel from '@/components/HistoryPanel';
import WatchlistPanel from '@/components/WatchlistPanel';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import PriceChart from '@/components/PriceChart';
import RsiChart from '@/components/RsiChart';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<StockAnalysisRecord[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [monitoring, setMonitoring] = useState(false);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('stock_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setHistory(data as StockAnalysisRecord[]);
  }, []);

  const fetchWatchlist = useCallback(async () => {
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setWatchlist(data as WatchlistItem[]);
  }, []);

  const fetchAlerts = useCallback(async () => {
    const { data } = await supabase
      .from('watchlist_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setAlerts(data as WatchlistAlert[]);
  }, []);

  useEffect(() => {
    fetchHistory();
    fetchWatchlist();
    fetchAlerts();
  }, [fetchHistory, fetchWatchlist, fetchAlerts]);

  const handleResult = useCallback(
    (data: AnalyzeResponse) => {
      setResult(data);
      fetchHistory();
    },
    [fetchHistory]
  );

  const analyzeTicker = useCallback(async (ticker: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${EDGE_FUNCTION_URL}?ticker=${encodeURIComponent(ticker)}`, {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Không thể tải phân tích cho mã này');
      const data: AnalyzeResponse = await response.json();
      handleResult(data);
    } finally {
      setLoading(false);
    }
  }, [handleResult]);

  const runWatchlistChecks = useCallback(async () => {
    if (watchlist.length === 0 || monitoring) return;
    setMonitoring(true);
    try {
      for (const item of watchlist) {
        if (!item.alerts_enabled) continue;
        const intervalMs = item.monitoring_interval === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const lastChecked = item.last_checked_at ? new Date(item.last_checked_at).getTime() : 0;
        if (Date.now() - lastChecked < intervalMs) continue;

        const response = await fetch(`${EDGE_FUNCTION_URL}?ticker=${encodeURIComponent(item.ticker)}&timeframe=${item.monitoring_interval}`, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) continue;
        const data: AnalyzeResponse = await response.json();
        const metrics = data.metrics;
        const movement = Number(metrics.change_pct) || 0;
        const threshold = Number(item.alert_threshold_pct) || 3;
        const shouldAlert = Math.abs(movement) >= threshold;
        const isBuySignal = metrics.forecast.action === 'MUA' && metrics.forecast.confidence >= 60;

        if (shouldAlert || isBuySignal) {
          const triggerType = shouldAlert ? 'price_move' : 'buy_signal';
          const message = shouldAlert
            ? `${item.ticker} biến động ${movement >= 0 ? 'tăng' : 'giảm'} vượt ngưỡng ${threshold}%`
            : `${item.ticker} xuất hiện tín hiệu MUA với độ tin cậy ${metrics.forecast.confidence}%`;
          await supabase.from('watchlist_alerts').insert({
            watchlist_id: item.id,
            ticker: item.ticker,
            timeframe: item.monitoring_interval,
            trigger_type: triggerType,
            price: metrics.current_price,
            movement_pct: movement,
            message,
          });
        }

        await supabase.from('watchlist').update({ last_checked_at: new Date().toISOString() }).eq('id', item.id);
      }
      await Promise.all([fetchWatchlist(), fetchAlerts()]);
    } finally {
      setMonitoring(false);
    }
  }, [watchlist, monitoring, fetchWatchlist, fetchAlerts]);

  useEffect(() => {
    const timer = window.setInterval(runWatchlistChecks, 60_000);
    return () => window.clearInterval(timer);
  }, [runWatchlistChecks]);

  const handleSelectHistory = useCallback((record: StockAnalysisRecord) => {
    if (!record.analysis) return;
    setResult({
      metrics: {
        ticker: record.ticker,
        timeframe: '1d',
        current_price: Number(record.current_price),
        change_pct: Number(record.change_pct),
        ma20: Number(record.ma20),
        ma50: Number(record.ma50),
        xu_huong_ngan: record.xu_huong_ngan || '',
        xu_huong_trung: record.xu_huong_trung || '',
        resistances: (record.resistances || []).map(Number),
        supports: (record.supports || []).map(Number),
        rsi: Number(record.rsi),
        rsi_label: record.rsi_label || '',
        bb_upper: Number(record.bb_upper),
        bb_basis: Number(record.bb_basis),
        bb_lower: Number(record.bb_lower),
        vol_label: record.vol_label || '',
        vol_ratio: Number(record.vol_ratio),
        quant: record.quant_metrics || {
          sharpe_ratio: 0,
          sortino_ratio: 0,
          max_drawdown: 0,
          max_drawdown_pct: 0,
          volatility_daily: 0,
          volatility_annual: 0,
          var_95: 0,
          var_99: 0,
          beta: 1,
          win_rate: 0,
          avg_win: 0,
          avg_loss: 0,
          profit_factor: 0,
          kelly_pct: 0,
          rrr: 0,
          position_size_pct: 0,
          risk_score: 50,
          risk_label: 'N/A',
        },
        forecast: record.forecast_metrics || {
          forecast_days: 5,
          predicted_return_pct: 0,
          predicted_direction: 'N/A',
          predicted_price: Number(record.current_price),
          stop_loss_pct: 5,
          take_profit_pct: 10,
          stop_loss_price: Number(record.current_price) * 0.95,
          take_profit_price: Number(record.current_price) * 1.05,
          action: 'NẮM GIỮ',
          confidence: 0,
          model_accuracy: 0,
          total_episodes: 0,
          cumulative_reward: 0,
          episode_accuracy: 0,
          features: {
            rsi: 50, momentum_5d: 0, momentum_20d: 0, vol_ratio: 1,
            bb_position: 50, ma_spread: 0, price_vs_ma20: 0, price_vs_ma50: 0,
          },
          rl_agent: {
            epsilon: 0.15, window_size: 100, q_table_size: 0,
            last_episode_reward: 0, profitable_episodes: 0, total_episodes: 0,
          },
        },
      },
      analysis: record.analysis,
      bars: [],
    });
  }, []);

  const handleClearHistory = useCallback(async () => {
    await supabase.from('stock_analyses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setHistory([]);
  }, []);

  const handleWatchlistToggle = useCallback(
    async (ticker: string) => {
      const existing = watchlist.find((w) => w.ticker === ticker.toUpperCase());
      if (existing) {
        await supabase.from('watchlist').delete().eq('id', existing.id);
      } else {
        await supabase.from('watchlist').insert({
          ticker: ticker.toUpperCase(),
          monitoring_interval: '1h',
          alerts_enabled: true,
          alert_threshold_pct: 3,
        });
      }
      fetchWatchlist();
    },
    [watchlist, fetchWatchlist]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen grid-pattern" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 no-print" style={{ backgroundColor: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e1061e, #b30518)' }}>
                <LineChart className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-main leading-tight">
                  Phân Tích Kỹ Thuật
                </h1>
                <p className="text-xs text-muted">Cổ phiếu Việt Nam · 6 bước</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-default bg-surface text-xs font-medium text-muted hover:border-primary hover:text-primary transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">In báo cáo</span>
                </button>
              )}
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-default bg-surface text-xs font-medium text-muted hover:border-primary hover:text-primary transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{theme === 'dark' ? 'Sáng' : 'Tối'}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Search & History */}
          <div className="lg:col-span-1 space-y-6 no-print">
            <StockSearch
              onResult={handleResult}
              onLoadingChange={setLoading}
              watchlist={watchlist}
              onWatchlistToggle={handleWatchlistToggle}
              onHistoryAdd={() => fetchHistory()}
            />
            <WatchlistPanel
              items={watchlist}
              alerts={alerts}
              monitoring={monitoring}
              onRefresh={() => { fetchWatchlist(); fetchAlerts(); runWatchlistChecks(); }}
              onRemove={async (id) => { await supabase.from('watchlist').delete().eq('id', id); fetchWatchlist(); }}
              onAnalyze={analyzeTicker}
            />
            <HistoryPanel
              history={history}
              onSelect={handleSelectHistory}
              onClear={handleClearHistory}
            />
          </div>

          {/* Right column - Results */}
          <div className="lg:col-span-2">
            {loading ? (
              <LoadingSkeleton />
            ) : result ? (
              <div className="space-y-4">
                <MetricsPanel metrics={result.metrics} />
                {result.bars && result.bars.length > 0 && (
                  <PriceChart
                    bars={result.bars}
                    ma20={result.metrics.ma20}
                    ma50={result.metrics.ma50}
                    resistances={result.metrics.resistances}
                    supports={result.metrics.supports}
                  />
                )}
                {result.bars && result.bars.length > 0 && (
                  <RsiChart
                    bars={result.bars}
                    currentRsi={result.metrics.rsi}
                    rsiLabel={result.metrics.rsi_label}
                    ma20={result.metrics.ma20}
                    ma50={result.metrics.ma50}
                  />
                )}
                {result.metrics.quant && (
                  <QuantPanel quant={result.metrics.quant} ticker={result.metrics.ticker} />
                )}
                {result.metrics.forecast && (
                  <ForecastPanel
                    forecast={result.metrics.forecast}
                    ticker={result.metrics.ticker}
                    currentPrice={result.metrics.current_price}
                  />
                )}
                <AnalysisResultPanel analysis={result.analysis} />
              </div>
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(225, 6, 30, 0.1)', border: '1px solid var(--color-border)' }}>
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-main mb-2">
                  Bắt đầu phân tích cổ phiếu
                </h3>
                <p className="text-sm text-muted max-w-sm">
                  Nhập mã cổ phiếu (VD: VNM, FPT, HPG) để nhận phân tích kỹ thuật chi tiết theo quy trình 6 bước:
                  bối cảnh thị trường, xu hướng, vùng giá, động lượng, kịch bản giao dịch và quản trị rủi ro.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-6 max-w-md w-full">
                  {[
                    'Bối cảnh VN-Index',
                    'Xu hướng & Vùng giá',
                    'Động lượng & Volume',
                    'Kịch bản giao dịch',
                    'Quản trị rủi ro',
                    'Khuyến nghị hành động',
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-input border border-default rounded-lg text-xs text-muted"
                    >
                      <span className="w-5 h-5 rounded-full text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0" style={{ backgroundColor: 'rgba(225, 6, 30, 0.1)' }}>
                        {i + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-dim">
              Dữ liệu phân tích mang tính chất tham khảo, không phải lời khuyên đầu tư
            </p>
            <div className="flex items-center gap-2 text-xs text-dim">
              <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>SSI</span>
              <span>· Powered by Supabase Edge Functions</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
