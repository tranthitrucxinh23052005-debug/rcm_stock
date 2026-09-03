import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Layers } from 'lucide-react';
import type { StockMetrics } from '@/types';

interface MetricsPanelProps {
  metrics: StockMetrics;
}

function TrendBadge({ trend }: { trend: string }) {
  const isUp = trend === 'Tăng';
  const isDown = trend === 'Giảm';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30' : isDown ? 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30' : 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {trend}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accentColor,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}) {
  return (
    <div className="bg-[#0a0e17] border border-[#2a3142] rounded-xl p-4 hover:border-[#3a4255] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${accentColor}`} />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
    </div>
  );
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  const changeColor = metrics.change_pct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';
  const changeSign = metrics.change_pct >= 0 ? '+' : '';

  const rsiColor =
    metrics.rsi >= 70
      ? 'text-[#ef4444]'
      : metrics.rsi <= 30
        ? 'text-[#10b981]'
        : 'text-[#f59e0b]';

  const volColor =
    metrics.vol_ratio >= 1.2
      ? 'text-[#10b981]'
      : metrics.vol_ratio < 0.7
        ? 'text-[#ef4444]'
        : 'text-slate-400';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Price header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white tracking-wide">{metrics.ticker}</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#00c2a8]/10 text-[#00c2a8] border border-[#00c2a8]/30 rounded uppercase tracking-wider">
                HOSE
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-bold text-white">
                {metrics.current_price.toLocaleString('vi-VN')}
              </span>
              <span className={`text-lg font-semibold ${changeColor}`}>
                {changeSign}{metrics.change_pct.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Xu hướng ngắn hạn</p>
              <TrendBadge trend={metrics.xu_huong_ngan} />
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-1">Xu hướng trung hạn</p>
              <TrendBadge trend={metrics.xu_huong_trung} />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="MA20"
          value={metrics.ma20.toFixed(2)}
          sublabel={`Giá ${metrics.current_price > metrics.ma20 ? 'trên' : 'dưới'} MA20`}
          icon={Activity}
          accentColor="text-[#3b82f6]"
        />
        <MetricCard
          label="MA50"
          value={metrics.ma50.toFixed(2)}
          sublabel={`Giá ${metrics.current_price > metrics.ma50 ? 'trên' : 'dưới'} MA50`}
          icon={Activity}
          accentColor="text-[#8b5cf6]"
        />
        <MetricCard
          label="RSI (14)"
          value={metrics.rsi.toFixed(1)}
          sublabel={metrics.rsi_label}
          icon={BarChart3}
          accentColor={rsiColor}
        />
        <MetricCard
          label="Khối lượng"
          value={`${metrics.vol_ratio.toFixed(2)}x`}
          sublabel={metrics.vol_label}
          icon={Layers}
          accentColor={volColor}
        />
      </div>

      {/* Bollinger Bands */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-white">Bollinger Bands (20, 2)</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Upper Band</p>
            <p className="text-lg font-bold text-[#ef4444]">{metrics.bb_upper.toFixed(2)}</p>
          </div>
          <div className="text-center border-x border-[#2a3142]">
            <p className="text-xs text-slate-500 mb-1">Basis (MA20)</p>
            <p className="text-lg font-bold text-slate-300">{metrics.bb_basis.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Lower Band</p>
            <p className="text-lg font-bold text-[#10b981]">{metrics.bb_lower.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Support / Resistance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#ef4444]" />
            <h4 className="text-sm font-semibold text-white">Kháng cự</h4>
          </div>
          <div className="space-y-2">
            {metrics.resistances.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-lg"
              >
                <span className="text-xs text-slate-400">R{metrics.resistances.length - i}</span>
                <span className="text-sm font-bold text-[#ef4444]">{r.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-[#10b981]" />
            <h4 className="text-sm font-semibold text-white">Hỗ trợ</h4>
          </div>
          <div className="space-y-2">
            {metrics.supports.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg"
              >
                <span className="text-xs text-slate-400">S{i + 1}</span>
                <span className="text-sm font-bold text-[#10b981]">{s.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
