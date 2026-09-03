import { useState, useCallback } from 'react';
import { Search, Loader2, Star, X } from 'lucide-react';
import { supabase, EDGE_FUNCTION_URL } from '@/lib/supabase';
import type { AnalyzeResponse, StockAnalysisRecord, WatchlistItem } from '@/types';

interface StockSearchProps {
  onResult: (data: AnalyzeResponse) => void;
  onLoadingChange: (loading: boolean) => void;
  watchlist: WatchlistItem[];
  onWatchlistToggle: (ticker: string) => void;
  onHistoryAdd: (record: StockAnalysisRecord) => void;
}

const POPULAR_TICKERS = ['VNM', 'FPT', 'VIC', 'HPG', 'MWG', 'VCB', 'ACB', 'HSG'];

export default function StockSearch({
  onResult,
  onLoadingChange,
  watchlist,
  onWatchlistToggle,
}: StockSearchProps) {
  const [ticker, setTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInWatchlist = (t: string) =>
    watchlist.some((w) => w.ticker === t.toUpperCase());

  const analyze = useCallback(
    async (tickerToAnalyze?: string) => {
      const target = (tickerToAnalyze ?? ticker).trim().toUpperCase();
      if (!target) {
        setError('Vui lòng nhập mã cổ phiếu');
        return;
      }

      setLoading(true);
      onLoadingChange(true);
      setError(null);

      try {
        const response = await fetch(`${EDGE_FUNCTION_URL}?ticker=${encodeURIComponent(target)}`, {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || `Lỗi ${response.status}`);
        }

        const data: AnalyzeResponse = await response.json();
        onResult(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể phân tích mã cổ phiếu này';
        setError(msg);
      } finally {
        setLoading(false);
        onLoadingChange(false);
      }
    },
    [ticker, onResult, onLoadingChange]
  );

  const handleWatchlistToggle = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    onWatchlistToggle(t);
  };

  return (
    <div className="glass-card p-6 glow-primary">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e1061e, #b30518)' }}>
          <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-main">Phân tích cổ phiếu</h2>
          <p className="text-sm text-muted">Nhập mã cổ phiếu để phân tích kỹ thuật</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && !loading && analyze()}
            placeholder="VD: VNM, FPT, HPG..."
            className="w-full px-4 py-3 bg-input border border-default rounded-xl text-main placeholder-[var(--color-text-dim)] focus:outline-none focus:border-primary transition-all uppercase tracking-wide font-medium"
            style={{ outline: 'none' }}
            disabled={loading}
          />
          {ticker && (
            <button
              onClick={() => setTicker('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {ticker && (
          <button
            onClick={handleWatchlistToggle}
            title={isInWatchlist(ticker) ? 'Xóa khỏi danh mục' : 'Thêm vào danh mục'}
            className="px-3 py-3 rounded-xl border border-default bg-input hover:bg-surface-2 transition-colors"
          >
            <Star
              className={`w-5 h-5 ${
                isInWatchlist(ticker) ? 'text-[var(--color-warning)] fill-[var(--color-warning)]' : 'text-muted'
              }`}
            />
          </button>
        )}
        <button
          onClick={() => analyze()}
          disabled={loading || !ticker.trim()}
          className="px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[120px] justify-center"
          style={{ background: 'linear-gradient(to right, #e1061e, #b30518)' }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang phân tích...</span>
            </>
          ) : (
            <span>Phân tích</span>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-3 px-4 py-2.5 rounded-lg text-sm animate-fade-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-down)' }}>
          {error}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-muted mb-2 font-medium">Mã phổ biến:</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTicker(t);
                analyze(t);
              }}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium bg-surface-2 border border-default rounded-lg text-muted hover:border-primary hover:text-primary transition-all disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {watchlist.length > 0 && (
        <div className="mt-4 pt-4 border-t border-default">
          <p className="text-xs text-muted mb-2 font-medium flex items-center gap-1.5">
            <Star className="w-3 h-3 text-[var(--color-warning)] fill-[var(--color-warning)]" />
            Danh mục theo dõi:
          </p>
          <div className="flex flex-wrap gap-2">
            {watchlist.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setTicker(w.ticker);
                  analyze(w.ticker);
                }}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--color-warning)] transition-all disabled:opacity-50"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
              >
                {w.ticker}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
