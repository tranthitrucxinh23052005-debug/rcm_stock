import { useState } from 'react';
import {
  Brain, TrendingUp, TrendingDown, Target, Shield, Activity, Award,
  RefreshCw, Gauge as GaugeIcon, Hand, ShoppingCart, Calculator,
} from 'lucide-react';
import type { MLForecast } from '@/types';
import { formatVN, formatPrice, formatPct } from '@/lib/format';

interface ForecastPanelProps {
  forecast: MLForecast;
  ticker: string;
  currentPrice: number;
}

export default function ForecastPanel({ forecast, ticker, currentPrice }: ForecastPanelProps) {
  const isUp = forecast.predicted_direction === 'TĂNG';
  const dirColor = isUp ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]';
  const DirIcon = isUp ? TrendingUp : TrendingDown;
  const bgColor = isUp
    ? { backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }
    : { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' };

  const isBuy = forecast.action === 'MUA';
  const actionColor = isBuy
    ? 'text-[var(--color-up)] bg-[var(--color-up)]/10 border-[var(--color-up)]/30'
    : 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30';
  const ActionIcon = isBuy ? ShoppingCart : Hand;

  const predictedPriceDiff = forecast.predicted_price - currentPrice;
  const predictedPricePct = ((predictedPriceDiff / currentPrice) * 100).toFixed(2);

  const [targetPrice, setTargetPrice] = useState<string>('');
  const [targetSessions, setTargetSessions] = useState<string>('5');

  const targetNum = parseFloat(targetPrice);
  const sessionsNum = parseInt(targetSessions, 10);
  const hasTarget = !isNaN(targetNum) && targetNum > 0 && !isNaN(sessionsNum) && sessionsNum > 0;

  const targetPct = hasTarget ? ((targetNum - currentPrice) / currentPrice) * 100 : 0;
  const requiredDailyReturn = hasTarget && sessionsNum > 0
    ? (Math.pow(targetNum / currentPrice, 1 / sessionsNum) - 1) * 100 : 0;
  const annualizedVol = forecast.features.vol_ratio > 0
    ? Math.abs(forecast.features.momentum_20d) / Math.sqrt(20) || 2 : 2;
  const expectedMovePct = hasTarget ? annualizedVol * Math.sqrt(sessionsNum) : 0;
  const feasible = hasTarget ? Math.abs(targetPct) <= expectedMovePct * 1.5 : false;
  const directionMatch = hasTarget ? (targetPct >= 0 && isUp) || (targetPct < 0 && !isUp) : false;

  const confidenceColor = forecast.confidence >= 70
    ? 'text-[var(--color-up)] bg-[var(--color-up)]/10 border-[var(--color-up)]/30'
    : forecast.confidence >= 40
      ? 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30'
      : 'text-[var(--color-down)] bg-[var(--color-down)]/10 border-[var(--color-down)]/30';

  const rewardColor = forecast.cumulative_reward >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]';
  const accuracyColor = forecast.episode_accuracy >= 60 ? 'text-[var(--color-up)]' : forecast.episode_accuracy >= 45 ? 'text-[var(--color-warning)]' : 'text-[var(--color-down)]';

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold text-main">RL Agent & Dự Báo</h3>
          <span className="text-xs text-muted ml-auto">{ticker}</span>
        </div>
        <p className="text-xs text-muted">Q-Learning Agent + Walk-Forward Validation (rolling window {forecast.rl_agent.window_size} phiên)</p>
      </div>

      <div className="glass-card p-5 border" style={bgColor}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DirIcon className={`w-6 h-6 ${dirColor}`} />
            <div>
              <p className="text-xs text-muted">Dự báo sau {forecast.forecast_days} phiên</p>
              <p className={`text-2xl font-bold ${dirColor}`}>
                {forecast.predicted_direction} {formatPct(forecast.predicted_return_pct)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Giá dự kiến</p>
            <p className="text-xl font-bold text-main">{formatPrice(forecast.predicted_price)}</p>
            <p className={`text-xs ${dirColor}`}>{predictedPriceDiff >= 0 ? '+' : ''}{formatVN(parseFloat(predictedPricePct))}% so với hiện tại</p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${actionColor}`}>
            <ActionIcon className="w-5 h-5" />
            <span className="text-sm font-bold">{forecast.action}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-default bg-input">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted">Epsilon: {formatVN(forecast.rl_agent.epsilon, 3)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-default bg-input">
            <GaugeIcon className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-xs text-muted">Q-States: {forecast.rl_agent.q_table_size}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Độ tin cậy</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${confidenceColor}`}>{forecast.confidence}%</span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${forecast.confidence >= 70 ? 'bg-[var(--color-up)]' : forecast.confidence >= 40 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-down)]'}`} style={{ width: `${Math.min(100, forecast.confidence)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-input rounded-lg" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            <Shield className="w-5 h-5 text-[var(--color-down)] flex-shrink-0" />
            <div>
              <p className="text-xs text-muted">Stop Loss</p>
              <p className="text-sm font-bold text-[var(--color-down)]">-{formatVN(forecast.stop_loss_pct)}%</p>
              <p className="text-xs text-dim">{formatPrice(forecast.stop_loss_price)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-input rounded-lg" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
            <Target className="w-5 h-5 text-[var(--color-up)] flex-shrink-0" />
            <div>
              <p className="text-xs text-muted">Take Profit</p>
              <p className="text-sm font-bold text-[var(--color-up)]">+{formatVN(forecast.take_profit_pct)}%</p>
              <p className="text-xs text-dim">{formatPrice(forecast.take_profit_price)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-main">RL Agent — Thống kê Episode</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <GaugeIcon className={`w-5 h-5 mx-auto mb-1 ${accuracyColor}`} />
            <p className="text-xs text-muted mb-1">Episode Accuracy</p>
            <p className={`text-lg font-bold ${accuracyColor}`}>{formatVN(forecast.episode_accuracy, 0)}%</p>
          </div>
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Award className={`w-5 h-5 mx-auto mb-1 ${rewardColor}`} />
            <p className="text-xs text-muted mb-1">Cumulative Reward</p>
            <p className={`text-lg font-bold ${rewardColor}`}>{forecast.cumulative_reward >= 0 ? '+' : ''}{forecast.cumulative_reward}</p>
          </div>
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Activity className="w-5 h-5 mx-auto mb-1 text-[#3b82f6]" />
            <p className="text-xs text-muted mb-1">Total Episodes</p>
            <p className="text-lg font-bold text-[#3b82f6]">{forecast.total_episodes}</p>
          </div>
          <div className="text-center p-3 bg-input border border-default rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-[var(--color-up)]" />
            <p className="text-xs text-muted mb-1">Profitable Episodes</p>
            <p className="text-lg font-bold text-[var(--color-up)]">{forecast.rl_agent.profitable_episodes}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between p-3 bg-input border border-default rounded-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted">Phần thưởng episode gần nhất</span>
          </div>
          <span className={`text-sm font-semibold ${forecast.rl_agent.last_episode_reward >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>
            {forecast.rl_agent.last_episode_reward >= 0 ? '+' : ''}{forecast.rl_agent.last_episode_reward}
          </span>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-main">Tính % tăng/giảm đến giá mục tiêu</h4>
        </div>
        <p className="text-xs text-muted mb-4">Nhập giá mục tiêu và số phiên để tính phần trăm biến động cần thiết và đánh giá khả năng đạt được.</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-xs text-muted">
            Giá mục tiêu (đ)
            <input type="number" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder={formatVN(currentPrice)} className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors" />
          </label>
          <label className="text-xs text-muted">
            Số phiên (N)
            <input type="number" min="1" max="60" value={targetSessions} onChange={(e) => setTargetSessions(e.target.value)} className="mt-1 w-full rounded-lg border border-default bg-input px-3 py-2.5 text-sm text-main outline-none focus:border-primary transition-colors" />
          </label>
        </div>

        {hasTarget && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between p-3 bg-input border border-default rounded-lg">
              <div>
                <p className="text-xs text-muted">Từ {formatPrice(currentPrice)} → {formatPrice(targetNum)}</p>
                <p className="text-xs text-dim">trong {sessionsNum} phiên</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${targetPct >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>{formatPct(targetPct)}</p>
                <p className="text-xs text-muted">{targetPct >= 0 ? 'tăng' : 'giảm'} {formatVN(Math.abs(targetPct))}%</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-input border border-default rounded-lg">
                <p className="text-xs text-muted mb-1">Lợi nhuận mỗi phiên</p>
                <p className={`text-sm font-bold ${requiredDailyReturn >= 0 ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>{requiredDailyReturn >= 0 ? '+' : ''}{formatVN(requiredDailyReturn, 3)}%/phiên</p>
              </div>
              <div className="p-3 bg-input border border-default rounded-lg">
                <p className="text-xs text-muted mb-1">Biến động kỳ vọng</p>
                <p className="text-sm font-bold text-muted">±{formatVN(expectedMovePct)}%</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${feasible ? '' : ''}`} style={feasible ? { backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' } : { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <Target className={`w-4 h-4 flex-shrink-0 ${feasible ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${feasible ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>{feasible ? 'Khả năng đạt được: Cao' : 'Khả năng đạt được: Thấp'}</p>
                <p className="text-xs text-muted mt-0.5">{feasible ? `Mục tiêu nằm trong vùng biến động kỳ vọng (${formatVN(expectedMovePct, 1)}%)` : `Mục tiêu vượt vùng biến động kỳ vọng (±${formatVN(expectedMovePct, 1)}%)`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border" style={directionMatch ? { backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' } : { backgroundColor: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
              <Brain className={`w-4 h-4 flex-shrink-0 ${directionMatch ? 'text-[var(--color-up)]' : 'text-[var(--color-warning)]'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${directionMatch ? 'text-[var(--color-up)]' : 'text-[var(--color-warning)]'}`}>{directionMatch ? 'Cùng hướng dự báo RL Agent' : 'Trái hướng dự báo RL Agent'}</p>
                <p className="text-xs text-muted mt-0.5">Agent dự báo {forecast.predicted_direction} {formatPct(forecast.predicted_return_pct)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-main">State Vector (đặc trưng đầu vào)</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'RSI(14)', value: forecast.features.rsi, unit: '', norm: 100 },
            { label: 'Momentum 5D', value: forecast.features.momentum_5d, unit: '%', norm: 20 },
            { label: 'Momentum 20D', value: forecast.features.momentum_20d, unit: '%', norm: 40 },
            { label: 'Vol Ratio', value: forecast.features.vol_ratio, unit: 'x', norm: 3 },
            { label: 'BB Position', value: forecast.features.bb_position, unit: '%', norm: 100 },
            { label: 'MA Spread', value: forecast.features.ma_spread, unit: '%', norm: 10 },
            { label: 'Price vs MA20', value: forecast.features.price_vs_ma20, unit: '%', norm: 20 },
            { label: 'Price vs MA50', value: forecast.features.price_vs_ma50, unit: '%', norm: 40 },
          ].map((feat) => {
            const pct = Math.min(100, Math.max(0, 50 + (feat.value / feat.norm) * 50));
            const isPositive = feat.value >= 0;
            return (
              <div key={feat.label} className="p-2.5 bg-input border border-default rounded-lg">
                <p className="text-xs text-muted mb-1">{feat.label}</p>
                <p className={`text-sm font-bold ${isPositive ? 'text-[var(--color-up)]' : 'text-[var(--color-down)]'}`}>{feat.value >= 0 ? '+' : ''}{feat.value}{feat.unit}</p>
                <div className="mt-1.5 h-1 bg-surface-2 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isPositive ? 'bg-[var(--color-up)]' : 'bg-[var(--color-down)]'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
