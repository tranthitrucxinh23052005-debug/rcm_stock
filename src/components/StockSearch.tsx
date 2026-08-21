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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00c2a8] to-[#00a890] flex items-center justify-center">
          <Search className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Phân tích cổ phiếu</h2>
          <p className="text-sm text-slate-400">Nhập mã cổ phiếu để phân tích kỹ thuật</p>
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
            className="w-full px-4 py-3 bg-[#0a0e17] border border-[#2a3142] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#00c2a8] focus:ring-2 focus:ring-[#00c2a8]/20 transition-all uppercase tracking-wide font-medium"
            disabled={loading}
          />
          {ticker && (
            <button
              onClick={() => setTicker('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {ticker && (
          <button
            onClick={handleWatchlistToggle}
            title={isInWatchlist(ticker) ? 'Xóa khỏi danh mục' : 'Thêm vào danh mục'}
            className="px-3 py-3 rounded-xl border border-[#2a3142] bg-[#0a0e17] hover:bg-[#1a2030] transition-colors"
          >
            <Star
              className={`w-5 h-5 ${
                isInWatchlist(ticker) ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-slate-400'
              }`}
            />
          </button>
        )}
        <button
          onClick={() => analyze()}
          disabled={loading || !ticker.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00c2a8] to-[#00a890] text-white font-semibold hover:from-[#00d4b8] hover:to-[#00b89e] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[120px] justify-center"
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
        <div className="mt-3 px-4 py-2.5 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg text-[#ef4444] text-sm animate-fade-in">
          {error}
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs text-slate-500 mb-2 font-medium">Mã phổ biến:</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setTicker(t);
                analyze(t);
              }}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-medium bg-[#1a2030] border border-[#2a3142] rounded-lg text-slate-300 hover:border-[#00c2a8] hover:text-[#00c2a8] transition-all disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {watchlist.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#2a3142]">
          <p className="text-xs text-slate-500 mb-2 font-medium flex items-center gap-1.5">
            <Star className="w-3 h-3 text-[#f59e0b] fill-[#f59e0b]" />
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
                className="px-3 py-1.5 text-xs font-medium bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-all disabled:opacity-50"
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
