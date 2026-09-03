export interface QuantMetrics {
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  volatility_daily: number;
  volatility_annual: number;
  var_95: number;
  var_99: number;
  beta: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  kelly_pct: number;
  rrr: number;
  position_size_pct: number;
  risk_score: number;
  risk_label: string;
}

export interface MLForecast {
  forecast_days: number;
  predicted_return_pct: number;
  predicted_direction: string;
  predicted_price: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  stop_loss_price: number;
  take_profit_price: number;
  action: string;
  confidence: number;
  model_accuracy: number;
  total_episodes: number;
  cumulative_reward: number;
  episode_accuracy: number;
  features: {
    rsi: number;
    momentum_5d: number;
    momentum_20d: number;
    vol_ratio: number;
    bb_position: number;
    ma_spread: number;
    price_vs_ma20: number;
    price_vs_ma50: number;
  };
  rl_agent: {
    epsilon: number;
    window_size: number;
    q_table_size: number;
    last_episode_reward: number;
    profitable_episodes: number;
    total_episodes: number;
  };
}

export interface StockMetrics {
  ticker: string;
  timeframe: '1h' | '1d';
  current_price: number;
  change_pct: number;
  ma20: number;
  ma50: number;
  xu_huong_ngan: string;
  xu_huong_trung: string;
  resistances: number[];
  supports: number[];
  rsi: number;
  rsi_label: string;
  bb_upper: number;
  bb_basis: number;
  bb_lower: number;
  vol_label: string;
  vol_ratio: number;
  quant: QuantMetrics;
  forecast: MLForecast;
}

export interface AnalysisResult {
  capNhat: string;
  vnindex: {
    gia: string;
    thayDoi: string;
    xuHuong: string;
    tomTat: string;
  };
  nhanDinhKyThuat: string;
  nhanDinhDinhLuong: string;
  nhanDinhDuBao: string;
  kichBan: Array<{
    loai: string;
    dieuKien: string;
    hanhDong: string;
  }>;
  khuyenNghi: {
    hanhDong: string;
    diemVao: string;
    dungLo: string;
    mucTieu: string;
    tyTrong: string;
  };
  canhBaoRuiRo: string;
  nguon: string[];
}

export interface AnalyzeResponse {
  metrics: StockMetrics;
  analysis: AnalysisResult;
}

export interface StockAnalysisRecord {
  id: string;
  ticker: string;
  current_price: number;
  change_pct: number;
  ma20: number | null;
  ma50: number | null;
  xu_huong_ngan: string | null;
  xu_huong_trung: string | null;
  resistances: number[] | null;
  supports: number[] | null;
  rsi: number | null;
  rsi_label: string | null;
  bb_upper: number | null;
  bb_basis: number | null;
  bb_lower: number | null;
  vol_label: string | null;
  vol_ratio: number | null;
  quant_metrics: QuantMetrics | null;
  forecast_metrics: MLForecast | null;
  analysis: AnalysisResult | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  note: string | null;
  monitoring_interval: '1h' | '1d';
  alerts_enabled: boolean;
  alert_threshold_pct: number;
  last_checked_at: string | null;
  created_at: string;
}

export interface WatchlistAlert {
  id: string;
  watchlist_id: string;
  ticker: string;
  timeframe: '1h' | '1d';
  trigger_type: 'price_move' | 'buy_signal' | 'stop_loss' | 'take_profit' | 'trend_change';
  price: number;
  movement_pct: number;
  message: string;
  created_at: string;
}
