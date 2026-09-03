import { Bell, BellOff, Clock3, ExternalLink, RefreshCw, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { WatchlistAlert, WatchlistItem } from '@/types';

interface WatchlistPanelProps {
  items: WatchlistItem[];
  alerts: WatchlistAlert[];
  monitoring: boolean;
  onRefresh: () => void;
  onRemove: (id: string) => void;
  onAnalyze: (ticker: string) => void;
}

function formatTime(value: string | null): string {
  if (!value) return 'Chưa kiểm tra';
  return new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function WatchlistPanel({
  items,
  alerts,
  monitoring,
  onRefresh,
  onRemove,
  onAnalyze,
}: WatchlistPanelProps) {
  const updateItem = async (id: string, changes: Partial<WatchlistItem>) => {
    const { error } = await supabase.from('watchlist').update(changes).eq('id', id);
    if (!error) onRefresh();
  };

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-[#f59e0b] fill-[#f59e0b]" />
          <div>
            <h2 className="text-base font-bold text-white">Danh mục quan sát</h2>
            <p className="text-xs text-slate-500">Theo dõi 1 giờ và 1 ngày khi ứng dụng đang mở</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${monitoring ? 'text-[#10b981]' : 'text-slate-500'}`}>
          <span className={`w-2 h-2 rounded-full ${monitoring ? 'bg-[#10b981] animate-pulse' : 'bg-slate-600'}`} />
          {monitoring ? 'Đang theo dõi' : 'Tạm dừng'}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2a3142] px-4 py-8 text-center">
          <Star className="w-7 h-7 mx-auto mb-2 text-slate-600" />
          <p className="text-sm text-slate-400">Chưa có mã trong danh mục</p>
          <p className="text-xs text-slate-600 mt-1">Thêm mã bằng nút ngôi sao ở ô tìm kiếm</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#2a3142] bg-[#0a0e17] p-3">
              <div className="flex items-center justify-between gap-3">
                <button onClick={() => onAnalyze(item.ticker)} className="flex items-center gap-2 text-left group">
                  <span className="text-base font-bold text-white group-hover:text-[#00c2a8] transition-colors">{item.ticker}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-[#00c2a8]" />
                </button>
                <button onClick={() => onRemove(item.id)} title="Xóa khỏi danh mục" className="p-1.5 text-slate-500 hover:text-[#ef4444] transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3">
                <label className="text-xs text-slate-500">
                  Khung kiểm tra
                  <select
                    value={item.monitoring_interval}
                    onChange={(event) => updateItem(item.id, { monitoring_interval: event.target.value as '1h' | '1d' })}
                    className="mt-1 w-full rounded-lg border border-[#2a3142] bg-[#141a28] px-2 py-2 text-xs text-slate-200 outline-none focus:border-[#00c2a8]"
                  >
                    <option value="1h">Mỗi 1 giờ</option>
                    <option value="1d">Mỗi 1 ngày</option>
                  </select>
                </label>
                <label className="text-xs text-slate-500">
                  Ngưỡng biến động
                  <input
                    type="number"
                    min="0.5"
                    max="20"
                    step="0.5"
                    value={item.alert_threshold_pct}
                    onChange={(event) => updateItem(item.id, { alert_threshold_pct: Number(event.target.value) })}
                    className="mt-1 w-full rounded-lg border border-[#2a3142] bg-[#141a28] px-2 py-2 text-xs text-slate-200 outline-none focus:border-[#00c2a8]"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1c2433]">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock3 className="w-3.5 h-3.5" />
                  Kiểm tra: {formatTime(item.last_checked_at)}
                </div>
                <button
                  onClick={() => updateItem(item.id, { alerts_enabled: !item.alerts_enabled })}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${item.alerts_enabled ? 'text-[#10b981]' : 'text-slate-500'}`}
                >
                  {item.alerts_enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                  {item.alerts_enabled ? 'Đang báo động' : 'Tắt báo động'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-slate-600">Lần quét kế tiếp phụ thuộc vào khung đã chọn</p>
        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-[#00c2a8] hover:text-[#66e3d4] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Làm mới
        </button>
      </div>

      {alerts.length > 0 && (
        <div className="border-t border-[#2a3142] pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-[#f59e0b]" />
            <h3 className="text-sm font-semibold text-white">Cảnh báo gần đây</h3>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 8).map((alert) => (
              <div key={alert.id} className="flex items-start justify-between gap-3 rounded-lg border border-[#2a3142] bg-[#141a28] px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium text-slate-200">{alert.message}</p>
                  <p className="text-[11px] text-slate-600 mt-1">{alert.ticker} · {alert.timeframe.toUpperCase()} · {formatTime(alert.created_at)}</p>
                </div>
                <span className={`text-xs font-bold whitespace-nowrap ${alert.movement_pct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {alert.movement_pct >= 0 ? '+' : ''}{alert.movement_pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
