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
    <div className="bg-[#0a0e17] border border-[#2a3142] rounded-xl p-4 hover:border-[#3a4255] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${accentColor}`} />
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
      {sublabel && <div className="text-xs text-slate-500 mt-0.5">{sublabel}</div>}
    </div>
  );
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 70
      ? 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30'
      : score >= 45
        ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30'
        : 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30';

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-[#0a0e17] border border-[#2a3142] rounded-xl p-5">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="#2a3142"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
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
  const sharpeColor =
    quant.sharpe_ratio >= 1
      ? 'text-[#10b981]'
      : quant.sharpe_ratio >= 0
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  const sortinoColor =
    quant.sortino_ratio >= 1
      ? 'text-[#10b981]'
      : quant.sortino_ratio >= 0
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  const betaColor =
    quant.beta > 1.2
      ? 'text-[#ef4444]'
      : quant.beta < 0.8
        ? 'text-[#10b981]'
        : 'text-[#3b82f6]';

  const winRateColor =
    quant.win_rate >= 55
      ? 'text-[#10b981]'
      : quant.win_rate >= 45
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  const profitFactorColor =
    quant.profit_factor >= 1.5
      ? 'text-[#10b981]'
      : quant.profit_factor >= 1
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  const kellyColor =
    quant.kelly_pct >= 25
      ? 'text-[#10b981]'
      : quant.kelly_pct >= 10
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  const rrrColor =
    quant.rrr >= 2
      ? 'text-[#10b981]'
      : quant.rrr >= 1
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Gauge className="w-5 h-5 text-[#00c2a8]" />
          <h3 className="text-base font-bold text-white">Phân Tích Định Lượng</h3>
          <span className="text-xs text-slate-500 ml-auto">{ticker}</span>
        </div>
        <p className="text-xs text-slate-500">
          Các chỉ số rủi ro - lợi nhuận dựa trên 200 phiên giao dịch gần nhất
        </p>
      </div>

      {/* Risk Gauge + Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RiskGauge score={quant.risk_score} label={quant.risk_label} />

        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <QuantCard
            label="Sharpe Ratio"
            value={quant.sharpe_ratio.toFixed(2)}
            sublabel={quant.sharpe_ratio >= 1 ? 'Hiệu suất điều chỉnh rủi ro tốt' : 'Cần cải thiện'}
            icon={Scale}
            accentColor={sharpeColor}
          />
          <QuantCard
            label="Sortino Ratio"
            value={quant.sortino_ratio.toFixed(2)}
            sublabel="Chỉ rủi ro giảm giá"
            icon={TrendingDown}
            accentColor={sortinoColor}
          />
          <QuantCard
            label="Volatility (Năm)"
            value={`${quant.volatility_annual.toFixed(1)}%`}
            sublabel={`Hàng ngày: ${quant.volatility_daily.toFixed(2)}%`}
            icon={Zap}
            accentColor="text-[#8b5cf6]"
          />
          <QuantCard
            label="Beta"
            value={quant.beta.toFixed(2)}
            sublabel={
              quant.beta > 1.2
                ? 'Biến động mạnh hơn thị trường'
                : quant.beta < 0.8
                  ? 'Ít biến động hơn thị trường'
                  : 'Di chuyển cùng thị trường'
            }
            icon={Crosshair}
            accentColor={betaColor}
          />
        </div>
      </div>

      {/* Drawdown & VaR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuantCard
          label="Max Drawdown"
          value={`${quant.max_drawdown_pct.toFixed(1)}%`}
          sublabel={`${quant.max_drawdown.toLocaleString('vi-VN')}đ`}
          icon={TrendingDown}
          accentColor="text-[#ef4444]"
        />
        <QuantCard
          label="VaR (95%)"
          value={`${quant.var_95.toFixed(2)}%`}
          sublabel="Tổn thất tối đa 95% tin cậy"
          icon={AlertOctagon}
          accentColor="text-[#f59e0b]"
        />
        <QuantCard
          label="VaR (99%)"
          value={`${quant.var_99.toFixed(2)}%`}
          sublabel="Tổn thất tối đa 99% tin cậy"
          icon={AlertOctagon}
          accentColor="text-[#ef4444]"
        />
        <QuantCard
          label="R:R Ratio"
          value={`${quant.rrr.toFixed(1)}:1`}
          sublabel="Lợi nhuận / Rủi ro"
          icon={Scale}
          accentColor={rrrColor}
        />
      </div>

      {/* Trading statistics */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-[#f59e0b]" />
          <h4 className="text-sm font-semibold text-white">Thống kê giao dịch</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Trophy className={`w-5 h-5 mx-auto mb-1 ${winRateColor}`} />
            <p className="text-xs text-slate-500 mb-1">Tỷ lệ thắng</p>
            <p className={`text-lg font-bold ${winRateColor}`}>{quant.win_rate.toFixed(0)}%</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Percent className="w-5 h-5 mx-auto mb-1 text-[#10b981]" />
            <p className="text-xs text-slate-500 mb-1">Trung bình lãi</p>
            <p className="text-lg font-bold text-[#10b981]">{quant.avg_win.toFixed(2)}%</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Percent className="w-5 h-5 mx-auto mb-1 text-[#ef4444]" />
            <p className="text-xs text-slate-500 mb-1">Trung bình lỗ</p>
            <p className="text-lg font-bold text-[#ef4444]">{quant.avg_loss.toFixed(2)}%</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Scale className={`w-5 h-5 mx-auto mb-1 ${profitFactorColor}`} />
            <p className="text-xs text-slate-500 mb-1">Profit Factor</p>
            <p className={`text-lg font-bold ${profitFactorColor}`}>{quant.profit_factor.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Position sizing */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-4 h-4 text-[#3b82f6]" />
          <h4 className="text-sm font-semibold text-white">Quản trị vị thế</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4 p-4 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#3b82f6]/10 border-2 border-[#3b82f6]/30 flex items-center justify-center">
              <span className="text-sm font-bold text-[#3b82f6]">
                {quant.position_size_pct.toFixed(0)}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Position Sizing</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Tỷ trọng tối đa dựa trên rủi ro 2%/lệnh và stop-loss tại hỗ trợ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-[#10b981]/10 border-2 border-[#10b981]/30 flex items-center justify-center">
              <span className={`text-sm font-bold ${kellyColor}`}>
                {quant.kelly_pct.toFixed(0)}%
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Kelly Criterion</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Tỷ trọng tối ưu theo công thức Kelly (dựa trên win rate và R:R)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
