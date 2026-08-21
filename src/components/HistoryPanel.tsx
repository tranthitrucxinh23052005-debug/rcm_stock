import { History, Clock, Trash2, ChevronRight } from 'lucide-react';
import type { StockAnalysisRecord } from '@/types';

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
          <h4 className="text-sm font-semibold text-white">Lịch sử phân tích</h4>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/30 rounded">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-[#ef4444] flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Xóa tất cả
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Chưa có phân tích nào</p>
          <p className="text-xs text-slate-600 mt-1">Phân tích mã cổ phiếu để lưu lại ở đây</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {history.map((record) => {
            const changeColor = record.change_pct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
            const changeSign = record.change_pct >= 0 ? '+' : '';
            return (
              <button
                key={record.id}
                onClick={() => onSelect(record)}
                className="w-full flex items-center gap-3 p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg hover:border-[#00c2a8] hover:bg-[#1a2030] transition-all group text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{record.ticker}</span>
                    <span className={`text-xs font-semibold ${changeColor}`}>
                      {changeSign}{Number(record.change_pct).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {Number(record.current_price).toLocaleString('vi-VN')}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">
                      RSI {Number(record.rsi).toFixed(0)}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">
                      {new Date(record.created_at).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-[#00c2a8] transition-colors flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
