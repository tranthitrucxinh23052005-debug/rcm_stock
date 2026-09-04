import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, TrendingDown, ArrowUpCircle, ArrowDownCircle, RefreshCw, Loader2, ChevronRight } from 'lucide-react';
import { supabase, EDGE_FUNCTION_URL } from '@/lib/supabase';
import { formatVN, formatPct, formatPrice } from '@/lib/format';
import type { StockAnalysisRecord, AnalyzeResponse } from '@/types';

interface RecommendationsPageProps {
  onAnalyze: (ticker: string) => void;
}

interface RecItem {
  ticker: string;
  action: string;
  confidence: number;
  currentPrice: number;
  changePct: number;
  rsi: number;
  rsiLabel: string;
  predictedDirection: string;
  predictedReturnPct: number;
  stopLossPct: number;
  takeProfitPct: number;
  riskLabel: string;
  riskScore: number;
  createdAt: string;
}

const POPULAR_TICKERS = ['VNM', 'FPT', 'VIC', 'HPG', 'MWG', 'VCB', 'ACB', 'HSG', 'TCB', 'STB', 'PNJ', 'GAS'];

export default function RecommendationsPage({ onAnalyze }: RecommendationsPageProps) {
  const [buyRecs, setBuyRecs] = useState<RecItem[]>([]);
  const [reduceRecs, setReduceRecs] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ done: 0, total: 0 });
  const [lastScan, setLastScan] = useState<string | null>(null);

  const fetchRecs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('stock_analyses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!data) return;

      const seen = new Map<string, StockAnalysisRecord>();
      for (const row of data as StockAnalysisRecord[]) {
        if (!seen.has(row.ticker)) seen.set(row.ticker, row);
      }

      const buys: RecItem[] = [];
      const reduces: RecItem[] = [];

      for (const row of seen.values()) {
        if (!row.forecast_metrics) continue;
        const fc = row.forecast_metrics;
        const action = fc.action || '';
        const isBuy = action.toLowerCase().includes('mua');
        const isReduce = action.toLowerCase().includes('hạ') || action.toLowerCase().includes('cắt') || action.toLowerCase().includes('chốt') || action.toLowerCase().includes('giảm');

        const item: RecItem = {
          ticker: row.ticker,
          action,
          confidence: fc.confidence || 0,
          currentPrice: Number(row.current_price),
          changePct: Number(row.change_pct),
          rsi: Number(row.rsi),
          rsiLabel: row.rsi_label || '',
          predictedDirection: fc.predicted_direction || 'N/A',
          predictedReturnPct: fc.predicted_return_pct || 0,
          stopLossPct: fc.stop_loss_pct || 0,
          takeProfitPct: fc.take_profit_pct || 0,
          riskLabel: row.quant_metrics?.risk_label || 'N/A',
          riskScore: row.quant_metrics?.risk_score || 50,
          createdAt: row.created_at,
        };

        if (isBuy) buys.push(item);
        else if (isReduce) reduces.push(item);
      }

      buys.sort((a, b) => b.confidence - a.confidence);
      reduces.sort((a, b) => b.confidence - a.confidence);
      setBuyRecs(buys);
      setReduceRecs(reduces);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  const scanAll = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress({ done: 0, total: POPULAR_TICKERS.length });
    try {
      for (let i = 0; i < POPULAR_TICKERS.length; i++) {
        const ticker = POPULAR_TICKERS[i];
        try {
          const response = await fetch(`${EDGE_FUNCTION_URL}?ticker=${encodeURIComponent(ticker)}`, {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            await response.json();
          }
        } catch {
          // skip individual failures
        }
        setScanProgress({ done: i + 1, total: POPULAR_TICKERS.length });
      }
      setLastScan(new Date().toISOString());
      await fetchRecs();
    } finally {
      setScanning(false);
    }
  }, [scanning, fetchRecs]);

  const buyCount = buyRecs.length;
  const reduceCount = reduceRecs.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e1061e, #b30518)' }}>
              <ShoppingCart className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-main">Khuyến nghị giao dịch</h2>
              <p className="text-xs text-muted">Tổng hợp từ các phân tích gần nhất trong cơ sở dữ liệu</p>
            </div>
          </div>
          <button
            onClick={scanAll}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(to right, #e1061e, #b30518)' }}
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang quét {scanProgress.done}/{scanProgress.total}...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Quét mã phổ biến</span>
              </>
            )}
          </button>
        </div>
        {lastScan && (
          <p className="text-xs text-dim mt-3">
            Quét lần cuối: {new Date(lastScan).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Buy recommendations */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpCircle className="w-5 h-5 text-[var(--color-up)]" />
              <h3 className="text-base font-bold text-main">Mã nên mua</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--color-up)', border: '1px solid rgba(16,185,129,0.3)' }}>
                {buyCount}
              </span>
            </div>

            {buyCount === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-8 h-8 text-dim mx-auto mb-2" />
                <p className="text-sm text-muted">Chưa có mã nào được khuyến nghị mua</p>
                <p className="text-xs text-dim mt-1">Nhấn "Quét mã phổ biến" để cập nhật dữ liệu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {buyRecs.map((item) => (
                  <RecRow key={item.ticker} item={item} variant="buy" onAnalyze={onAnalyze} />
                ))}
              </div>
            )}
          </div>

          {/* Reduce recommendations */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowDownCircle className="w-5 h-5 text-[var(--color-down)]" />
              <h3 className="text-base font-bold text-main">Mã nên hạ tỷ trọng</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-down)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {reduceCount}
              </span>
            </div>

            {reduceCount === 0 ? (
              <div className="text-center py-8">
                <TrendingDown className="w-8 h-8 text-dim mx-auto mb-2" />
                <p className="text-sm text-muted">Chưa có mã nào cần hạ tỷ trọng</p>
                <p className="text-xs text-dim mt-1">Nhấn "Quét mã phổ biến" để cập nhật dữ liệu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reduceRecs.map((item) => (
                  <RecRow key={item.ticker} item={item} variant="reduce" onAnalyze={onAnalyze} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RecRow({ item, variant, onAnalyze }: { item: RecItem; variant: 'buy' | 'reduce'; onAnalyze: (t: string) => void }) {
  const isBuy = variant === 'buy';
  const accentColor = isBuy ? 'var(--color-up)' : 'var(--color-down)';
  const accentBg = isBuy ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)';
  const accentBorder = isBuy ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';

  const confColor = item.confidence >= 70 ? 'var(--color-up)' : item.confidence >= 40 ? 'var(--color-warning)' : 'var(--color-down)';
  const changeColor = item.changePct >= 0 ? 'var(--color-up)' : 'var(--color-down)';

  return (
    <button
      onClick={() => onAnalyze(item.ticker)}
      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all group text-left hover:border-primary"
      style={{ backgroundColor: accentBg, border: `1px solid ${accentBorder}` }}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: isBuy ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
        {isBuy ? <ArrowUpCircle className="w-5 h-5" style={{ color: accentColor }} /> : <ArrowDownCircle className="w-5 h-5" style={{ color: accentColor }} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-main text-base">{item.ticker}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ color: accentColor, backgroundColor: isBuy ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
            {item.action}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted">
          <span>Giá: <span className="font-medium text-main">{formatVN(item.currentPrice)}</span></span>
          <span style={{ color: changeColor }} className="font-medium">{formatPct(item.changePct)}</span>
          <span>RSI: <span className="font-medium text-main">{formatVN(item.rsi, 0)}</span></span>
          <span>Dự báo: <span className="font-medium" style={{ color: item.predictedDirection === 'TĂNG' ? 'var(--color-up)' : 'var(--color-down)' }}>{item.predictedDirection} {formatPct(item.predictedReturnPct)}</span></span>
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs text-muted">Độ tin cậy</span>
          <span className="text-sm font-bold" style={{ color: confColor }}>{item.confidence}%</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-dim justify-end">
          <span>SL: -{formatVN(item.stopLossPct)}%</span>
          <span>TP: +{formatVN(item.takeProfitPct)}%</span>
        </div>
        <div className="text-xs text-dim mt-0.5">Rủi ro: {item.riskLabel}</div>
      </div>

      <ChevronRight className="w-4 h-4 text-dim group-hover:text-primary transition-colors flex-shrink-0" />
    </button>
  );
}
