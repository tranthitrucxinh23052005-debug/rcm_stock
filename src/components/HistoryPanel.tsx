import { History, Clock, Trash2, ChevronRight } from 'lucide-react';
import type { StockAnalysisRecord } from '@/types';
import { formatVN, formatPct } from '@/lib/format';

interface HistoryPanelProps {
  history: StockAnalysisRecord[];
  onSelect: (record: StockAnalysisRecord) => void;
  onClear: () => void;
}

export default function HistoryPanel({ history, onSelect, onClear }: HistoryPanelProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-main">Lịch sử phân tích</h4>
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button onClick={onClear} className="text-xs text-muted hover:text-[var(--color-down)] flex items-center gap-1 transition-colors">
            <Trash2 className="w-3 h-3" />
            Xóa tất cả
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-dim mx-auto mb-2" />
          <p className="text-sm text-muted">Chưa có phân tích nào</p>
          <p className="text-xs text-dim mt-1">Phân tích mã cổ phiếu để lưu lại ở đây</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {history.map((record) => {
            const changeColor = record.change_pct >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]';
            return (
              <button
                key={record.id}
                onClick={() => onSelect(record)}
                className="w-full flex items-center gap-3 p-3 bg-input border border-default rounded-lg hover:border-primary transition-all group text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-main text-sm">{record.ticker}</span>
                    <span className={`text-xs font-semibold ${changeColor}`}>{formatPct(Number(record.change_pct))}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted">{formatVN(Number(record.current_price))}</span>
                    <span className="text-xs text-dim">·</span>
                    <span className="text-xs text-muted">RSI {formatVN(Number(record.rsi), 0)}</span>
                    <span className="text-xs text-dim">·</span>
                    <span className="text-xs text-muted">
                      {new Date(record.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-dim group-hover:text-primary transition-colors flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
