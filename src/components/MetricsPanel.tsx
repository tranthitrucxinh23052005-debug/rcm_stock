import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Layers } from 'lucide-react';
import type { StockMetrics } from '@/types';
import { formatVN, formatPct } from '@/lib/format';

interface MetricsPanelProps {
  metrics: StockMetrics;
}

function TrendBadge({ trend }: { trend: string }) {
  const isUp = trend === 'Tăng';
  const isDown = trend === 'Giảm';
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp
    ? 'text-[var(--color-up)] bg-[var(--color-up)]/10 border-[var(--color-up)]/30'
    : isDown
      ? 'text-[var(--color-down)] bg-[var(--color-down)]/10 border-[var(--color-down)]/30'
      : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30';

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
    <div className="bg-input border border-default rounded-xl p-4 hover:border-hover transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${accentColor}`} />
      </div>
      <div className="text-xl font-bold text-main">{value}</div>
      {sublabel && <div className="text-xs text-muted mt-0.5">{sublabel}</div>}
    </div>
  );
}

export default function MetricsPanel({ metrics }: MetricsPanelProps) {
  const changeColor = metrics.change_pct >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]';

  const rsiColor =
    metrics.rsi >= 70
      ? 'text-[var(--color-down)]'
      : metrics.rsi <= 30
        ? 'text-[var(--color-up)]'
        : 'text-[var(--color-warning)]';

  const volColor =
    metrics.vol_ratio >= 1.2
      ? 'text-[var(--color-up)]'
      : metrics.vol_ratio < 0.7
        ? 'text-[var(--color-down)]'
        : 'text-muted';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Price header */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-main tracking-wide">{metrics.ticker}</h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary rounded uppercase tracking-wider" style={{ backgroundColor: 'rgba(225, 6, 30, 0.1)' }}>
                HOSE
              </span>
            </div>
            <div className="flex items-baseline gap-3 mt-2">
              <span className="text-3xl font-bold text-main">
                {formatVN(metrics.current_price)}
              </span>
              <span className={`text-lg font-semibold ${changeColor}`}>
                {formatPct(metrics.change_pct)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="text-right">
              <p className="text-xs text-muted mb-1">Xu hướng ngắn hạn</p>
              <TrendBadge trend={metrics.xu_huong_ngan} />
            </div>
            <div className="text-right">
              <p className="text-xs text-muted mb-1">Xu hướng trung hạn</p>
              <TrendBadge trend={metrics.xu_huong_trung} />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="MA20"
          value={formatVN(metrics.ma20)}
          sublabel={`Giá ${metrics.current_price > metrics.ma20 ? 'trên' : 'dưới'} MA20`}
          icon={Activity}
          accentColor="text-[#3b82f6]"
        />
        <MetricCard
          label="MA50"
          value={formatVN(metrics.ma50)}
          sublabel={`Giá ${metrics.current_price > metrics.ma50 ? 'trên' : 'dưới'} MA50`}
          icon={Activity}
          accentColor="text-[var(--color-primary)]"
        />
        <MetricCard
          label="RSI (14)"
          value={formatVN(metrics.rsi, 1)}
          sublabel={metrics.rsi_label}
          icon={BarChart3}
          accentColor={rsiColor}
        />
        <MetricCard
          label="Khối lượng"
          value={`${formatVN(metrics.vol_ratio, 2)}x`}
          sublabel={metrics.vol_label}
          icon={Layers}
          accentColor={volColor}
        />
      </div>

      {/* Bollinger Bands */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-main">Bollinger Bands (20, 2)</h4>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xs text-muted mb-1">Upper Band</p>
            <p className="text-lg font-bold text-[var(--color-down)]">{formatVN(metrics.bb_upper)}</p>
          </div>
          <div className="text-center border-x border-default">
            <p className="text-xs text-muted mb-1">Basis (MA20)</p>
            <p className="text-lg font-bold text-muted">{formatVN(metrics.bb_basis)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted mb-1">Lower Band</p>
            <p className="text-lg font-bold text-[var(--color-up)]">{formatVN(metrics.bb_lower)}</p>
          </div>
        </div>
      </div>

      {/* Support / Resistance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--color-down)]" />
            <h4 className="text-sm font-semibold text-main">Kháng cự</h4>
          </div>
          <div className="space-y-2">
            {metrics.resistances.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
              >
                <span className="text-xs text-muted">R{metrics.resistances.length - i}</span>
                <span className="text-sm font-bold text-[var(--color-down)]">{formatVN(r)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-[var(--color-up)]" />
            <h4 className="text-sm font-semibold text-main">Hỗ trợ</h4>
          </div>
          <div className="space-y-2">
            {metrics.supports.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
              >
                <span className="text-xs text-muted">S{i + 1}</span>
                <span className="text-sm font-bold text-[var(--color-up)]">{formatVN(s)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
