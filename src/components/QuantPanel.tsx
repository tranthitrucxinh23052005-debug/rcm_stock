import {
  Gauge,
  TrendingDown,
  Percent,
  Crosshair,
  Trophy,
  Scale,
  PieChart,
  AlertOctagon,
  Zap,
} from 'lucide-react';
import type { QuantMetrics } from '@/types';
import { formatVN, formatInt, formatPrice } from '@/lib/format';

interface QuantPanelProps {
  quant: QuantMetrics;
  ticker: string;
}

function QuantCard({
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
      <div className="text-lg font-bold text-main">{value}</div>
      {sublabel && <div className="text-xs text-muted mt-0.5">{sublabel}</div>}
    </div>
  );
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70
      ? 'text-[var(--color-down)] bg-[var(--color-down)]/10 border-[var(--color-down)]/30'
      : score >= 45
        ? 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30'
        : 'text-[var(--color-up)] bg-[var(--color-up)]/10 border-[var(--color-up)]/30';

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-input border border-default rounded-xl p-5">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className={color.split(' ')[0]}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${color.split(' ')[0]}`}>{score}</span>
        </div>
      </div>
      <span className={`mt-2 px-3 py-1 rounded-lg text-xs font-semibold border ${color}`}>
        Rủi ro {label}
      </span>
    </div>
  );
}

export default function QuantPanel({ quant, ticker }: QuantPanelProps) {
  const sharpeColor = quant.sharpe_ratio >= 1 ? 'text-[var(--color-up)]' : quant.sharpe_ratio >= 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';
  const sortinoColor = quant.sortino_ratio >= 1 ? 'text-[var(--color-up)]' : quant.sortino_ratio >= 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';
  const betaColor = quant.beta > 1.2 ? 'text-[var(--color-down)]' : quant.beta < 0.8 ? 'text-[var(--color-up)]' : 'text-[#3b82f6]';
  const winRateColor = quant.win_rate >= 55 ? 'text-[var(--color-up)]' : quant.win_rate >= 45 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';
  const profitFactorColor = quant.profit_factor >= 1.5 ? 'text-[var(--color-up)]' : quant.profit_factor >= 1 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';
  const kellyColor = quant.kelly_pct >= 25 ? 'text-[var(--color-up)]' : quant.kelly_pct >= 10 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';
  const rrrColor = quant.rrr >= 2 ? 'text-[var(--color-up)]' : quant.rrr >= 1 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-main">Phân Tích Định Lượng</h3>
          <span className="text-xs text-muted ml-auto">{ticker}</span>
        </div>
        <p className="text-xs text-muted">Các chỉ số rủi ro - lợi nhuận dựa trên 200 phiên giao dịch gần nhất</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RiskGauge score={quant.risk_score} label={quant.risk_label} />
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <QuantCard label="Sharpe Ratio" value={formatVN(quant.sharpe_ratio)} sublabel={quant.sharpe_ratio >= 1 ? 'Hiệu suất điều chỉnh rủi ro tốt' : 'Cần cải thiện'} icon={Scale} accentColor={sharpeColor} />
          <QuantCard label="Sortino Ratio" value={formatVN(quant.sortino_ratio)} sublabel="Chỉ rủi ro giảm giá" icon={TrendingDown} accentColor={sortinoColor} />
          <QuantCard label="Volatility (Năm)" value={`${formatVN(quant.volatility_annual, 1)}%`} sublabel={`Hàng ngày: ${formatVN(quant.volatility_daily)}%`} icon={Zap} accentColor="text-primary" />
          <QuantCard label="Beta" value={formatVN(quant.beta)} sublabel={quant.beta > 1.2 ? 'Biến động mạnh hơn thị trường' : quant.beta < 0.8 ? 'Ít biến động hơn thị trường' : 'Di chuyển cùng thị trường'} icon={Crosshair} accentColor={betaColor} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuantCard label="Max Drawdown" value={`${formatVN(quant.max_drawdown_pct, 1)}%`} sublabel={formatPrice(quant.max_drawdown)} icon={TrendingDown} accentColor="text-[var(--color-down)]" />
        <QuantCard label="VaR (95%)" value={`${formatVN(quant.var_95)}%`} sublabel="Tổn thất tối đa 95% tin cậy" icon={AlertOctagon} accentColor="text-[var(--color-warning)]" />
        <QuantCard label="VaR (99%)" value={`${formatVN(quant.var_99)}%`} sublabel="Tổn thất tối đa 99% tin cậy" icon={AlertOctagon} accentColor="text-[var(--color-down)]" />
        <QuantCard label="R:R Ratio" value={`${formatVN(quant.rrr, 1)}:1`} sublabel="Lợi nhuận / Rủi ro" icon={Scale} accentColor={rrrColor} />
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-[var(--color-warning)]" />
          <h4 className="text-sm font-semibold text-main">Thống kê giao dịch</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Trophy className={`w-5 h-5 mx-auto mb-1 ${winRateColor}`} />
            <p className="text-xs text-muted mb-1">Tỷ lệ thắng</p>
            <p className={`text-lg font-bold ${winRateColor}`}>{formatInt(quant.win_rate)}%</p>
          </div>
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Percent className="w-5 h-5 mx-auto mb-1 text-[var(--color-up)]" />
            <p className="text-xs text-muted mb-1">Trung bình lãi</p>
            <p className="text-lg font-bold text-[var(--color-up)]">{formatVN(quant.avg_win)}%</p>
          </div>
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Percent className="w-5 h-5 mx-auto mb-1 text-[var(--color-down)]" />
            <p className="text-xs text-muted mb-1">Trung bình lỗ</p>
            <p className="text-lg font-bold text-[var(--color-down)]">{formatVN(quant.avg_loss)}%</p>
          </div>
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Scale className={`w-5 h-5 mx-auto mb-1 ${profitFactorColor}`} />
            <p className="text-xs text-muted mb-1">Profit Factor</p>
            <p className={`text-lg font-bold ${profitFactorColor}`}>{formatVN(quant.profit_factor)}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-main">Quản trị vị thế</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 bg-input border border-default rounded-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
              <span className="text-sm font-bold text-[#3b82f6]">{formatVN(quant.position_size_pct, 1)}%</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-main">Position Sizing</p>
              <p className="text-xs text-muted mt-0.5">%Risk_Max (2%) / %Khoảng_cách_StopLoss = {formatVN(quant.position_size_pct, 1)}% vốn</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-input border border-default rounded-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <span className={`text-sm font-bold ${kellyColor}`}>{formatInt(quant.kelly_pct)}%</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-main">Kelly Criterion</p>
              <p className="text-xs text-muted mt-0.5">Kelly = (Win% × R:R - Loss%) / R:R, dựa trên win rate và R:R thực tế</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
