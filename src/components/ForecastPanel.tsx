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

  const stopLossPrice = (currentPrice * (1 - forecast.stop_loss_pct / 100)).toFixed(2);
  const takeProfitPrice = (currentPrice * (1 + forecast.take_profit_pct / 100)).toFixed(2);
  const predictedPriceDiff = forecast.predicted_price - currentPrice;
  const predictedPricePct = ((predictedPriceDiff / currentPrice) * 100).toFixed(2);

  const confidenceColor =
    forecast.confidence >= 70
      ? 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/30'
      : forecast.confidence >= 40
        ? 'text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/30'
        : 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/30';

  const rewardColor =
    forecast.cumulative_reward >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]';

  const accuracyColor =
    forecast.model_accuracy >= 60
      ? 'text-[#10b981]'
      : forecast.model_accuracy >= 45
        ? 'text-[#f59e0b]'
        : 'text-[#ef4444]';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5 text-[#8b5cf6]" />
          <h3 className="text-base font-bold text-white">Dự Báo ML & Tự Học</h3>
          <span className="text-xs text-slate-500 ml-auto">{ticker}</span>
        </div>
        <p className="text-xs text-slate-500">
          Mô hình Linear Regression + Gradient Descent, tự train lại mỗi lần phân tích
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
              <p className="text-xs text-slate-600">{Number(stopLossPrice).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#0a0e17] border border-[#10b981]/20 rounded-lg">
            <Target className="w-5 h-5 text-[#10b981] flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Take Profit</p>
              <p className="text-sm font-bold text-[#10b981]">+{forecast.take_profit_pct}%</p>
              <p className="text-xs text-slate-600">{Number(takeProfitPrice).toLocaleString('vi-VN')}đ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Self-learning stats */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 text-[#00c2a8]" />
          <h4 className="text-sm font-semibold text-white">Hệ thống tự học (Reward/Penalty)</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <GaugeIcon className={`w-5 h-5 mx-auto mb-1 ${accuracyColor}`} />
            <p className="text-xs text-slate-500 mb-1">Độ chính xác</p>
            <p className={`text-lg font-bold ${accuracyColor}`}>{forecast.model_accuracy}%</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Award className={`w-5 h-5 mx-auto mb-1 ${rewardColor}`} />
            <p className="text-xs text-slate-500 mb-1">Thưởng/Phạt</p>
            <p className={`text-lg font-bold ${rewardColor}`}>
              {forecast.cumulative_reward >= 0 ? '+' : ''}{forecast.cumulative_reward}
            </p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Activity className="w-5 h-5 mx-auto mb-1 text-[#3b82f6]" />
            <p className="text-xs text-slate-500 mb-1">Dự báo đã đánh giá</p>
            <p className="text-lg font-bold text-[#3b82f6]">{forecast.self_learning.evaluated_predictions}</p>
          </div>
          <div className="text-center p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-[#10b981]" />
            <p className="text-xs text-slate-500 mb-1">Sai số TB</p>
            <p className="text-lg font-bold text-[#10b981]">{forecast.self_learning.avg_error}%</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between p-3 bg-[#0a0e17] border border-[#2a3142] rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs text-slate-500">Lần train gần nhất</span>
          </div>
          <span className="text-sm font-semibold text-white">
            {forecast.self_learning.last_train_accuracy}% chính xác hướng
          </span>
        </div>
      </div>

      {/* Feature breakdown */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-[#8b5cf6]" />
          <h4 className="text-sm font-semibold text-white">Đặc trưng đầu vào mô hình</h4>
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
