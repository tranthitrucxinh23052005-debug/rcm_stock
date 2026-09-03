import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Activity,
  Award,
  RefreshCw,
  Gauge as GaugeIcon,
  Hand,
  ShoppingCart,
  Calculator,
} from 'lucide-react';
import type { MLForecast } from '@/types';

interface ForecastPanelProps {
  forecast: MLForecast;
  ticker: string;
  currentPrice: number;
}

export default function ForecastPanel({ forecast, ticker, currentPrice }: ForecastPanelProps) {
  const isUp = forecast.predicted_direction === 'TĂNG';
  const dirColor = isUp ? 'text-[#10b981]' : 'text-[#ef4444]';
  const DirIcon = isUp ? TrendingUp : TrendingDown;
  const bgColor = isUp ? 'bg-[#10b981]/5 border-[#10b981]/20' : 'bg-[#ef4444]/5 border-[#ef4444]/20';

  const isBuy = forecast.action === 'MUA';
  const actionColor = isBuy ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30' : 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30';
  const ActionIcon = isBuy ? ShoppingCart : Hand;

  const predictedPriceDiff = forecast.predicted_price - currentPrice;
  const predictedPricePct = ((predictedPriceDiff / currentPrice) * 100).toFixed(2);

  // Price target calculator state
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [targetSessions, setTargetSessions] = useState<string>('5');

  const targetNum = parseFloat(targetPrice);
  const sessionsNum = parseInt(targetSessions, 10);
  const hasTarget = !isNaN(targetNum) && targetNum > 0 && !isNaN(sessionsNum) && sessionsNum > 0;

  const targetPct = hasTarget ? ((targetNum - currentPrice) / currentPrice) * 100 : 0;
  const requiredDailyReturn = hasTarget && sessionsNum > 0
    ? (Math.pow(targetNum / currentPrice, 1 / sessionsNum) - 1) * 100
    : 0;
  const annualizedVol = forecast.features.vol_ratio > 0
    ? Math.abs(forecast.features.momentum_20d) / Math.sqrt(20) || 2
    : 2;
  const expectedMovePct = hasTarget ? annualizedVol * Math.sqrt(sessionsNum) : 0;
  const feasible = hasTarget ? Math.abs(targetPct) <= expectedMovePct * 1.5 : false;
  const directionMatch = hasTarget
    ? (targetPct >= 0 && isUp) || (targetPct < 0 && !isUp)
    : false;

  const confidenceColor =
    forecast.confidence >= 70
      ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30'
      : forecast.confidence >= 40
        ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30'
        : 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';

  const rewardColor = forecast.cumulative_reward >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';

  const accuracyColor =
    forecast.episode_accuracy >= 60
      ? 'text-[#10b981]'
      : forecast.episode_accuracy >= 45
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-base font-bold text-white">RL Agent & Dự Báo</h3>
          <span className="text-xs text-slate-500 ml-auto">{ticker}</span>
        </div>
        <p className="text-xs text-slate-500">
          Q-Learning Agent + Walk-Forward Validation (rolling window {forecast.rl_agent.window_size} phiên)
        </p>
      </div>

      {/* Main prediction card */}
      <div className={`glass-card p-5 border ${bgColor}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DirIcon className={`w-6 h-6 ${dirColor}`} />
            <div>
              <p className="text-xs text-slate-500">Dự báo sau {forecast.forecast_days} phiên</p>
              <p className={`text-2xl font-bold ${dirColor}`}>
                {forecast.predicted_direction} {forecast.predicted_return_pct >= 0 ? '+' : ''}
                {forecast.predicted_return_pct}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Giá dự kiến</p>
            <p className="text-xl font-bold text-white">
              {forecast.predicted_price.toLocaleString('vi-VN')}đ
            </p>
            <p className={`text-xs ${dirColor}`}>
              {predictedPriceDiff >= 0 ? '+' : ''}{predictedPricePct}% so với hiện tại
            </p>
          </div>
        </div>

        {/* Action badge */}
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${actionColor}`}>
            <ActionIcon className="w-5 h-5" />
            <span className="text-sm font-bold">{forecast.action}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a3142] bg-[#0a0e17]">
            <Activity className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs text-slate-400">
              Epsilon: {forecast.rl_agent.epsilon.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a3142] bg-[#0a0e17]">
            <GaugeIcon className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-xs text-slate-400">
              Q-States: {forecast.rl_agent.q_table_size}
            </span>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Độ tin cậy</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${confidenceColor}`}>
              {forecast.confidence}%
            </span>
          </div>
          <div className="h-2 bg-[#1a2030] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                forecast.confidence >= 70 ? 'bg-[#10b981]' : forecast.confidence >= 40 ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
              }`}
              style={{ width: `${Math.min(100, forecast.confidence)}%` }}
            />
          </div>
        </div>

        {/* Stop loss / Take profit */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-[#0a0e17] border border-[#ef4444]/20 rounded-lg">
            <Shield className="w-5 h-5 text-[#ef4444] flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Stop Loss</p>
              <p className="text-sm font-bold text-[#ef4444]">-{forecast.stop_loss_pct}%</p>
              <p className="text-xs text-slate-600">{forecast.stop_loss_price.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#0a0e17] border border-[#10b981]/20 rounded-lg">
            <Target className="w-5 h-5 text-[#10b981] flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Take Profit</p>
              <p className="text-sm font-bold text-[#10b981]">+{forecast.take_profit_pct}%</p>
              <p className="text-xs text-slate-600">{forecast.take_profit_price.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </div>
      </div>

      {/* RL Agent stats */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-[#00c2a8]" />
          <h4 className="text-sm font-semibold text-white">RL Agent — Thống kê Episode</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <GaugeIcon className={`w-5 h-5 mx-auto mb-1 ${accuracyColor}`} />
            <p className="text-xs text-slate-500 mb-1">Episode Accuracy</p>
            <p className={`text-lg font-bold ${accuracyColor}`}>{forecast.episode_accuracy}%</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Award className={`w-5 h-5 mx-auto mb-1 ${rewardColor}`} />
            <p className="text-xs text-slate-500 mb-1">Cumulative Reward</p>
            <p className={`text-lg font-bold ${rewardColor}`}>
              {forecast.cumulative_reward >= 0 ? '+' : ''}{forecast.cumulative_reward}
            </p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Activity className="w-5 h-5 mx-auto mb-1 text-[#3b82f6]" />
            <p className="text-xs text-slate-500 mb-1">Total Episodes</p>
            <p className="text-lg font-bold text-[#3b82f6]">{forecast.total_episodes}</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-[#10b981]" />
            <p className="text-xs text-slate-500 mb-1">Profitable Episodes</p>
            <p className="text-lg font-bold text-[#10b981]">{forecast.rl_agent.profitable_episodes}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs text-slate-500">Phần thưởng episode gần nhất</span>
          </div>
          <span className={`text-sm font-semibold ${forecast.rl_agent.last_episode_reward >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {forecast.rl_agent.last_episode_reward >= 0 ? '+' : ''}{forecast.rl_agent.last_episode_reward}
          </span>
        </div>
      </div>

      {/* Price target calculator */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#00c2a8]" />
          <h4 className="text-sm font-semibold text-white">Tính % tăng/giảm đến giá mục tiêu</h4>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Nhập giá mục tiêu và số phiên để tính phần trăm biến động cần thiết và đánh giá khả năng đạt được.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-xs text-slate-500">
            Giá mục tiêu (đ)
            <input
              type="number"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder={currentPrice.toFixed(2)}
              className="mt-1 w-full rounded-lg border border-[#2a3142] bg-[#0a0e17] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00c2a8] transition-colors"
            />
          </label>
          <label className="text-xs text-slate-500">
            Số phiên (N)
            <input
              type="number"
              min="1"
              max="60"
              value={targetSessions}
              onChange={(e) => setTargetSessions(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#2a3142] bg-[#0a0e17] px-3 py-2.5 text-sm text-white outline-none focus:border-[#00c2a8] transition-colors"
            />
          </label>
        </div>

        {hasTarget && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
              <div>
                <p className="text-xs text-slate-500">Từ {currentPrice.toLocaleString('vi-VN')}đ → {targetNum.toLocaleString('vi-VN')}đ</p>
                <p className="text-xs text-slate-600">trong {sessionsNum} phiên</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${targetPct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {targetPct >= 0 ? '+' : ''}{targetPct.toFixed(2)}%
                </p>
                <p className="text-xs text-slate-500">
                  {targetPct >= 0 ? 'tăng' : 'giảm'} {Math.abs(targetPct).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Lợi nhuận mỗi phiên</p>
                <p className={`text-sm font-bold ${requiredDailyReturn >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {requiredDailyReturn >= 0 ? '+' : ''}{requiredDailyReturn.toFixed(3)}%/phiên
                </p>
              </div>
              <div className="p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Biến động kỳ vọng</p>
                <p className="text-sm font-bold text-slate-300">±{expectedMovePct.toFixed(2)}%</p>
              </div>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-lg border ${feasible ? 'bg-[#10b981]/5 border-[#10b981]/20' : 'bg-[#ef4444]/5 border-[#ef4444]/20'}`}>
              <Target className={`w-4 h-4 flex-shrink-0 ${feasible ? 'text-[#10b981]' : 'text-[#ef4444]'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${feasible ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {feasible ? 'Khả năng đạt được: Cao' : 'Khả năng đạt được: Thấp'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {feasible
                    ? `Mục tiêu nằm trong vùng biến động kỳ vọng (${expectedMovePct.toFixed(1)}%)`
                    : `Mục tiêu vượt vùng biến động kỳ vọng (±${expectedMovePct.toFixed(1)}%)`}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-2 p-3 rounded-lg border ${directionMatch ? 'bg-[#10b981]/5 border-[#10b981]/20' : 'bg-[#f59e0b]/5 border-[#f59e0b]/20'}`}>
              <Brain className={`w-4 h-4 flex-shrink-0 ${directionMatch ? 'text-[#10b981]' : 'text-[#f59e0b]'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${directionMatch ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
                  {directionMatch ? 'Cùng hướng dự báo RL Agent' : 'Trái hướng dự báo RL Agent'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Agent dự báo {forecast.predicted_direction} {forecast.predicted_return_pct >= 0 ? '+' : ''}{forecast.predicted_return_pct}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature breakdown */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#8b5cf6]" />
          <h4 className="text-sm font-semibold text-white">State Vector (đặc trưng đầu vào)</h4>
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
              <div key={feat.label} className="p-2.5 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
                <p className="text-xs text-slate-500 mb-1">{feat.label}</p>
                <p className={`text-sm font-bold ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {feat.value >= 0 ? '+' : ''}{feat.value}{feat.unit}
                </p>
                <div className="mt-1.5 h-1 bg-[#1a2030] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPositive ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
