import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OHLCBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface QuantMetrics {
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

interface MLForecast {
  forecast_days: number;
  predicted_return_pct: number;
  predicted_direction: string;
  predicted_price: number;
  stop_loss_pct: number;
  take_profit_pct: number;
  confidence: number;
  model_accuracy: number;
  total_predictions: number;
  cumulative_reward: number;
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
  self_learning: {
    last_train_accuracy: number;
    avg_error: number;
    reward_penalty: number;
    evaluated_predictions: number;
    correct_predictions: number;
  };
}

interface MLModelState {
  ticker: string;
  weights: Record<string, number>;
  bias: number;
  learning_rate: number;
  total_predictions: number;
  correct_predictions: number;
  cumulative_reward: number;
  avg_error: number;
  last_trained_at: string;
}

interface StockMetrics {
  ticker: string;
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

interface AnalysisResult {
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Technical indicator calculations (from raw OHLCV) ---

function sma(values: number[], period: number): number {
  if (values.length < period) return 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Wilder's RSI (standard method used by TradingView)
function calcRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let avgGain = 0;
  let avgLoss = 0;
  // Initial average
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  // Smooth remaining
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return round2(100 - 100 / (1 + rs));
}

function calcBollingerBands(closes: number[], period: number = 20, mult: number = 2) {
  const basis = sma(closes, period);
  if (closes.length < period) return { upper: 0, basis: 0, lower: 0 };
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - basis, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: round2(basis + mult * stdDev),
    basis: round2(basis),
    lower: round2(basis - mult * stdDev),
  };
}

function classifyRsi(rsi: number): string {
  if (rsi >= 70) return "Quá mua";
  if (rsi >= 60) return "Mạnh";
  if (rsi >= 45) return "Trung tính";
  if (rsi >= 30) return "Yếu";
  return "Quá bán";
}

function classifyVolume(ratio: number): string {
  if (ratio >= 1.5) return "Khối lượng tăng mạnh";
  if (ratio >= 1.0) return "Khối lượng bình thường";
  if (ratio >= 0.7) return "Khối lượng giảm";
  return "Khối lượng cạn";
}

function classifyTrend(price: number, ma: number): string {
  if (price > ma * 1.01) return "Tăng";
  if (price < ma * 0.99) return "Giảm";
  return "Đi ngang";
}

// --- Quantitative metrics calculations ---

const RISK_FREE_RATE_DAILY = 0.0001; // ~2.5% annual / 252
const TRADING_DAYS = 252;

function dailyReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  return returns;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], m?: number): number {
  if (values.length === 0) return 0;
  const mu = m ?? mean(values);
  const variance = values.reduce((s, v) => s + Math.pow(v - mu, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calcSharpe(returns: number[]): number {
  if (returns.length < 2) return 0;
  const m = mean(returns);
  const sd = stdDev(returns, m);
  if (sd === 0) return 0;
  return round2((m - RISK_FREE_RATE_DAILY) / sd * Math.sqrt(TRADING_DAYS));
}

function calcSortino(returns: number[]): number {
  if (returns.length < 2) return 0;
  const m = mean(returns);
  const downside = returns.filter(r => r < 0);
  if (downside.length === 0) return 0;
  const downsideDev = Math.sqrt(downside.reduce((s, v) => s + v * v, 0) / returns.length);
  if (downsideDev === 0) return 0;
  return round2((m - RISK_FREE_RATE_DAILY) / downsideDev * Math.sqrt(TRADING_DAYS));
}

function calcMaxDrawdown(closes: number[]): { mdd: number; mddPct: number } {
  if (closes.length < 2) return { mdd: 0, mddPct: 0 };
  let peak = closes[0];
  let maxDD = 0;
  let maxDDPct = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = peak - c;
    const ddPct = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
    if (ddPct > maxDDPct) maxDDPct = ddPct;
  }
  return { mdd: round2(maxDD), mddPct: round2(maxDDPct * 100) };
}

function calcVaR(returns: number[], confidence: number): number {
  if (returns.length < 10) return 0;
  const sorted = [...returns].sort((a, b) => a - b);
  const idx = Math.floor((1 - confidence) * sorted.length);
  return round2(sorted[idx] * 100);
}

function calcBeta(stockReturns: number[], indexReturns: number[]): number {
  const n = Math.min(stockReturns.length, indexReturns.length);
  if (n < 2) return 1;
  const sr = stockReturns.slice(-n);
  const ir = indexReturns.slice(-n);
  const sm = mean(sr);
  const im = mean(ir);
  let cov = 0;
  for (let i = 0; i < n; i++) cov += (sr[i] - sm) * (ir[i] - im);
  cov /= n;
  const iv = stdDev(ir, im) ** 2;
  if (iv === 0) return 1;
  return round2(cov / iv);
}

function calcWinRateStats(returns: number[]): { winRate: number; avgWin: number; avgLoss: number; profitFactor: number } {
  if (returns.length === 0) return { winRate: 0, avgWin: 0, avgLoss: 0, profitFactor: 0 };
  const wins = returns.filter(r => r > 0);
  const losses = returns.filter(r => r < 0);
  const winRate = round2((wins.length / returns.length) * 100);
  const avgWin = wins.length > 0 ? round2((mean(wins) * 100)) : 0;
  const avgLoss = losses.length > 0 ? round2((Math.abs(mean(losses)) * 100)) : 0;
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const profitFactor = grossLoss > 0 ? round2(grossWin / grossLoss) : wins.length > 0 ? 99 : 0;
  return { winRate, avgWin, avgLoss, profitFactor };
}

function calcKelly(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0 || winRate === 0) return 0;
  const b = avgWin / avgLoss;
  const p = winRate / 100;
  const q = 1 - p;
  const kelly = (b * p - q) / b;
  return Math.max(0, round2(kelly * 100));
}

function calcPositionSize(currentPrice: number, stopLoss: number, riskPerTradePct: number = 2): number {
  const riskPerShare = Math.abs(currentPrice - stopLoss);
  if (riskPerShare === 0) return 0;
  const riskAmount = riskPerTradePct;
  const positionPct = (riskAmount / (riskPerShare / currentPrice * 100)) * 1;
  return Math.min(100, Math.max(0, round2(positionPct)));
}

function calcRiskScore(volatility: number, maxDDPct: number, sharpe: number, var95: number): { score: number; label: string } {
  let score = 50;
  score += Math.min(20, volatility * 200);
  score += Math.min(20, maxDDPct * 0.5);
  score -= Math.min(15, Math.abs(sharpe) * 5);
  score += Math.min(15, Math.abs(var95) * 2);
  score = Math.max(0, Math.min(100, Math.round(score)));
  let label = "Thấp";
  if (score >= 70) label = "Cao";
  else if (score >= 45) label = "Trung bình";
  return { score, label };
}

function computeQuantMetrics(
  bars: OHLCBar[],
  indexBars: OHLCBar[],
  currentPrice: number,
  primarySupport: number,
  primaryResistance: number
): QuantMetrics {
  const closes = bars.map(b => b.c);
  const returns = dailyReturns(closes);
  const indexReturns = indexBars.length > 1 ? dailyReturns(indexBars.map(b => b.c)) : [];

  const sharpe_ratio = calcSharpe(returns);
  const sortino_ratio = calcSortino(returns);
  const { mdd, mddPct } = calcMaxDrawdown(closes);
  const volatility_daily = round2(stdDev(returns) * 100);
  const volatility_annual = round2(stdDev(returns) * Math.sqrt(TRADING_DAYS) * 100);
  const var_95 = calcVaR(returns, 0.95);
  const var_99 = calcVaR(returns, 0.99);
  const beta = indexReturns.length > 1 ? calcBeta(returns, indexReturns) : 1;
  const { winRate, avgWin, avgLoss, profitFactor } = calcWinRateStats(returns);
  const kelly_pct = calcKelly(winRate, avgWin, avgLoss);

  const stopLoss = primarySupport || round2(currentPrice * 0.95);
  const target = primaryResistance || round2(currentPrice * 1.05);
  const rrr = stopLoss !== currentPrice ? round2((target - currentPrice) / (currentPrice - stopLoss)) : 0;
  const position_size_pct = calcPositionSize(currentPrice, stopLoss);
  const { score: risk_score, label: risk_label } = calcRiskScore(volatility_daily / 100, mddPct, sharpe_ratio, var_95);

  return {
    sharpe_ratio,
    sortino_ratio,
    max_drawdown: mdd,
    max_drawdown_pct: mddPct,
    volatility_daily,
    volatility_annual,
    var_95,
    var_99,
    beta,
    win_rate: winRate,
    avg_win: avgWin,
    avg_loss: avgLoss,
    profit_factor: profitFactor,
    kelly_pct,
    rrr,
    position_size_pct,
    risk_score,
    risk_label,
  };
}

// --- ML Prediction Engine: Linear Regression with Gradient Descent + Self-Learning ---

const FORECAST_DAYS = 5;
const FEATURE_KEYS = ["rsi", "momentum_5d", "momentum_20d", "vol_ratio", "bb_position", "ma_spread", "price_vs_ma20", "price_vs_ma50"];

interface FeatureSet {
  rsi: number;
  momentum_5d: number;
  momentum_20d: number;
  vol_ratio: number;
  bb_position: number;
  ma_spread: number;
  price_vs_ma20: number;
  price_vs_ma50: number;
}

function extractFeatures(bars: OHLCBar[], idx: number): FeatureSet | null {
  if (idx < 50 || idx >= bars.length) return null;
  const closes = bars.slice(0, idx + 1).map(b => b.c);
  const volumes = bars.slice(0, idx + 1).map(b => b.v);
  const current = closes[closes.length - 1];

  const rsi = calcRSI(closes, 14);
  const momentum_5d = idx >= 5 ? round2(((current - closes[closes.length - 6]) / closes[closes.length - 6]) * 100) : 0;
  const momentum_20d = idx >= 20 ? round2(((current - closes[closes.length - 21]) / closes[closes.length - 21]) * 100) : 0;

  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const vol_ratio = avgVol20 > 0 ? round2(volumes[volumes.length - 1] / avgVol20) : 1;

  const bb = calcBollingerBands(closes, 20, 2);
  const bb_position = bb.upper !== bb.lower ? round2((current - bb.lower) / (bb.upper - bb.lower) * 100) : 50;

  const ma20 = sma(closes, 20);
  const ma50 = sma(closes, 50);
  const ma_spread = ma50 > 0 ? round2(((ma20 - ma50) / ma50) * 100) : 0;
  const price_vs_ma20 = ma20 > 0 ? round2(((current - ma20) / ma20) * 100) : 0;
  const price_vs_ma50 = ma50 > 0 ? round2(((current - ma50) / ma50) * 100) : 0;

  return { rsi, momentum_5d, momentum_20d, vol_ratio, bb_position, ma_spread, price_vs_ma20, price_vs_ma50 };
}

function featureToVector(f: FeatureSet): number[] {
  return FEATURE_KEYS.map(k => (f as unknown as Record<string, number>)[k]);
}

function normalizeFeatures(vec: number[]): number[] {
  const norms = [
    100,  // rsi 0-100
    20,   // momentum_5d ~±20%
    40,   // momentum_20d ~±40%
    3,    // vol_ratio 0-3
    100,  // bb_position 0-100
    10,   // ma_spread ~±10%
    20,   // price_vs_ma20 ~±20%
    40,   // price_vs_ma50 ~±40%
  ];
  return vec.map((v, i) => v / norms[i]);
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function predictLinear(weights: number[], bias: number, features: number[]): number {
  return dotProduct(weights, features) + bias;
}

function trainModel(
  bars: OHLCBar[],
  priorWeights: number[] | null,
  priorBias: number,
  learningRate: number
): { weights: number[]; bias: number; trainAccuracy: number; avgError: number } {
  const samples: { features: number[]; target: number }[] = [];
  const startIdx = 50;
  const endIdx = bars.length - FORECAST_DAYS;

  for (let i = startIdx; i < endIdx; i++) {
    const f = extractFeatures(bars, i);
    if (!f) continue;
    const futurePrice = bars[i + FORECAST_DAYS].c;
    const currentPrice = bars[i].c;
    const targetReturn = (futurePrice - currentPrice) / currentPrice * 100;
    samples.push({ features: normalizeFeatures(featureToVector(f)), target: targetReturn });
  }

  if (samples.length < 10) {
    return { weights: priorWeights || FEATURE_KEYS.map(() => 0), bias: priorBias, trainAccuracy: 0, avgError: 0 };
  }

  let weights = priorWeights ? [...priorWeights] : FEATURE_KEYS.map(() => 0);
  let bias = priorBias;

  // Gradient descent: 200 epochs
  const epochs = 200;
  for (let epoch = 0; epoch < epochs; epoch++) {
    let totalError = 0;
    const gradW = weights.map(() => 0);
    let gradB = 0;

    for (const s of samples) {
      const pred = predictLinear(weights, bias, s.features);
      const error = pred - s.target;
      totalError += Math.abs(error);
      for (let j = 0; j < gradW.length; j++) {
        gradW[j] += error * s.features[j];
      }
      gradB += error;
    }

    const n = samples.length;
    for (let j = 0; j < weights.length; j++) {
      weights[j] -= (learningRate * gradW[j]) / n;
    }
    bias -= (learningRate * gradB) / n;
  }

  // Evaluate training accuracy (direction prediction)
  let correct = 0;
  let totalErr = 0;
  for (const s of samples) {
    const pred = predictLinear(weights, bias, s.features);
    if ((pred > 0 && s.target > 0) || (pred < 0 && s.target < 0) || (pred === 0 && s.target === 0)) correct++;
    totalErr += Math.abs(pred - s.target);
  }
  const trainAccuracy = round2((correct / samples.length) * 100);
  const avgError = round2(totalErr / samples.length);

  return { weights, bias, trainAccuracy, avgError };
}

async function evaluatePastPredictions(
  supabaseClient: ReturnType<typeof createClient>,
  ticker: string,
  bars: OHLCBar[]
): Promise<{ evaluated: number; correct: number; totalReward: number; avgError: number }> {
  const { data: unevaluated } = await supabaseClient
    .from("ml_predictions")
    .select("*")
    .eq("ticker", ticker)
    .eq("evaluated", false)
    .order("predicted_at", { ascending: true })
    .limit(50);

  if (!unevaluated || unevaluated.length === 0) {
    return { evaluated: 0, correct: 0, totalReward: 0, avgError: 0 };
  }

  let evaluated = 0;
  let correct = 0;
  let totalReward = 0;
  let totalErr = 0;

  for (const pred of unevaluated) {
    const predDate = new Date(pred.predicted_at);
    const predTimestamp = Math.floor(predDate.getTime() / 1000);
    const futureBars = bars.filter(b => b.t > predTimestamp);
    const needed = pred.forecast_days;

    if (futureBars.length < needed + 1) continue;

    const entryPrice = pred.features ? (pred.features as Record<string, number>).entry_price || bars.find(b => b.t > predTimestamp)?.c || 0 : 0;
    const actualFuturePrice = futureBars[needed - 1].c;
    if (entryPrice <= 0) continue;

    const actualReturn = round2(((actualFuturePrice - entryPrice) / entryPrice) * 100);
    const predictedReturn = Number(pred.predicted_return_pct);
    const error = round2(Math.abs(predictedReturn - actualReturn));
    const directionCorrect = (predictedReturn > 0 && actualReturn > 0) || (predictedReturn < 0 && actualReturn < 0);

    // Reward/penalty: +1 for correct direction, -1 for wrong. Scaled by confidence and error.
    const reward = directionCorrect
      ? round2(pred.confidence * (1 - Math.min(1, error / 10)))
      : round2(-pred.confidence * (1 + Math.min(1, error / 10)));

    if (directionCorrect) correct++;
    totalReward += reward;
    totalErr += error;
    evaluated++;

    await supabaseClient
      .from("ml_predictions")
      .update({
        evaluated: true,
        actual_return_pct: actualReturn,
        prediction_error: error,
        reward_penalty: reward,
      })
      .eq("id", pred.id);
  }

  return {
    evaluated,
    correct,
    totalReward: round2(totalReward),
    avgError: evaluated > 0 ? round2(totalErr / evaluated) : 0,
  };
}

async function getModelState(
  supabaseClient: ReturnType<typeof createClient>,
  ticker: string
): Promise<MLModelState | null> {
  const { data } = await supabaseClient
    .from("ml_model_state")
    .select("*")
    .eq("ticker", ticker)
    .maybeSingle();

  if (!data) return null;
  return {
    ticker: data.ticker,
    weights: data.weights as Record<string, number>,
    bias: Number(data.bias),
    learning_rate: Number(data.learning_rate),
    total_predictions: data.total_predictions,
    correct_predictions: data.correct_predictions,
    cumulative_reward: Number(data.cumulative_reward),
    avg_error: Number(data.avg_error),
    last_trained_at: data.last_trained_at,
  };
}

async function saveModelState(
  supabaseClient: ReturnType<typeof createClient>,
  ticker: string,
  weights: number[],
  bias: number,
  learningRate: number,
  totalPreds: number,
  correctPreds: number,
  cumulativeReward: number,
  avgError: number
): Promise<void> {
  const weightMap: Record<string, number> = {};
  FEATURE_KEYS.forEach((k, i) => { weightMap[k] = weights[i]; });

  const { error } = await supabaseClient
    .from("ml_model_state")
    .upsert({
      ticker,
      weights: weightMap,
      bias,
      learning_rate: learningRate,
      total_predictions: totalPreds,
      correct_predictions: correctPreds,
      cumulative_reward: cumulativeReward,
      avg_error: avgError,
      last_trained_at: new Date().toISOString(),
    }, { onConflict: "ticker" });

  if (error) console.error("Model state save error:", error.message);
}

async function computeMLForecast(
  supabaseClient: ReturnType<typeof createClient>,
  ticker: string,
  bars: OHLCBar[],
  currentPrice: number,
  support: number,
  resistance: number
): Promise<MLForecast> {
  // 1. Evaluate past predictions (self-learning: reward/penalty)
  const evalResult = await evaluatePastPredictions(supabaseClient, ticker, bars);

  // 2. Load prior model state
  const priorState = await getModelState(supabaseClient, ticker);
  const priorWeights = priorState ? FEATURE_KEYS.map(k => priorState.weights[k] || 0) : null;
  const priorBias = priorState ? priorState.bias : 0;

  // 3. Adjust learning rate based on past performance (reward feedback)
  let learningRate = priorState ? priorState.learning_rate : 0.01;
  if (evalResult.evaluated > 0) {
    // If model was doing well, slow down learning (exploit). If poorly, speed up (explore).
    const accuracy = evalResult.correct / evalResult.evaluated;
    if (accuracy >= 0.6) learningRate = Math.max(0.001, learningRate * 0.8);
    else if (accuracy < 0.4) learningRate = Math.min(0.05, learningRate * 1.5);
  }

  // 4. Train model on latest data
  const { weights, bias, trainAccuracy, avgError: trainAvgError } = trainModel(
    bars, priorWeights, priorBias, learningRate
  );

  // 5. Predict future return using current features
  const currentFeatures = extractFeatures(bars, bars.length - 1);
  if (!currentFeatures) {
    return createEmptyForecast(currentPrice, support, resistance);
  }

  const featureVec = normalizeFeatures(featureToVector(currentFeatures));
  const predictedReturn = round2(predictLinear(weights, bias, featureVec));
  const predictedDirection = predictedReturn >= 0 ? "TĂNG" : "GIẢM";
  const predictedPrice = round2(currentPrice * (1 + predictedReturn / 100));

  // 6. Calculate stop loss and take profit based on prediction + volatility
  const closes = bars.map(b => b.c);
  const returns = dailyReturns(closes);
  const dailyVol = stdDev(returns);
  const stopLossPct = round2(Math.min(15, Math.max(3, (dailyVol * 2 * 100) + Math.abs(predictedReturn) * 0.5)));
  const takeProfitPct = round2(Math.min(20, Math.max(5, Math.abs(predictedReturn) * 1.5 + dailyVol * 100)));

  // 7. Confidence: based on training accuracy and feature alignment
  const modelAccuracy = priorState && priorState.total_predictions > 0
    ? round2((priorState.correct_predictions / priorState.total_predictions) * 100)
    : trainAccuracy;
  const confidence = round2(Math.min(95, Math.max(10, modelAccuracy * 0.7 + Math.min(30, Math.abs(predictedReturn) * 3))));

  // 8. Update model state with evaluation results
  const newTotalPreds = (priorState?.total_predictions || 0) + evalResult.evaluated;
  const newCorrectPreds = (priorState?.correct_predictions || 0) + evalResult.correct;
  const newCumulativeReward = round2((priorState?.cumulative_reward || 0) + evalResult.totalReward);
  const newAvgError = evalResult.evaluated > 0
    ? round2(((priorState?.avg_error || 0) * (priorState?.total_predictions || 0) + evalResult.avgError * evalResult.evaluated) / Math.max(1, (priorState?.total_predictions || 0) + evalResult.evaluated))
    : priorState?.avg_error || trainAvgError;

  await saveModelState(
    supabaseClient, ticker, weights, bias, learningRate,
    newTotalPreds, newCorrectPreds, newCumulativeReward, newAvgError
  );

  // 9. Save this prediction for future evaluation
  const { error: predError } = await supabaseClient.from("ml_predictions").insert({
    ticker,
    predicted_at: new Date().toISOString(),
    forecast_days: FORECAST_DAYS,
    predicted_return_pct: predictedReturn,
    predicted_direction: predictedDirection,
    stop_loss_pct: stopLossPct,
    take_profit_pct: takeProfitPct,
    confidence,
    features: { ...currentFeatures, entry_price: currentPrice },
    model_weights: Object.fromEntries(FEATURE_KEYS.map((k, i) => [k, weights[i]])),
  });

  if (predError) console.error("Prediction save error:", predError.message);

  return {
    forecast_days: FORECAST_DAYS,
    predicted_return_pct: predictedReturn,
    predicted_direction: predictedDirection,
    predicted_price: predictedPrice,
    stop_loss_pct: stopLossPct,
    take_profit_pct: takeProfitPct,
    confidence,
    model_accuracy: modelAccuracy,
    total_predictions: newTotalPreds,
    cumulative_reward: newCumulativeReward,
    features: currentFeatures,
    self_learning: {
      last_train_accuracy: trainAccuracy,
      avg_error: newAvgError,
      reward_penalty: evalResult.totalReward,
      evaluated_predictions: (priorState?.total_predictions || 0) + evalResult.evaluated,
      correct_predictions: newCorrectPreds,
    },
  };
}

function createEmptyForecast(currentPrice: number, support: number, resistance: number): MLForecast {
  return {
    forecast_days: FORECAST_DAYS,
    predicted_return_pct: 0,
    predicted_direction: "N/A",
    predicted_price: currentPrice,
    stop_loss_pct: 5,
    take_profit_pct: 10,
    confidence: 0,
    model_accuracy: 0,
    total_predictions: 0,
    cumulative_reward: 0,
    features: {
      rsi: 50, momentum_5d: 0, momentum_20d: 0, vol_ratio: 1,
      bb_position: 50, ma_spread: 0, price_vs_ma20: 0, price_vs_ma50: 0,
    },
    self_learning: {
      last_train_accuracy: 0, avg_error: 0, reward_penalty: 0,
      evaluated_predictions: 0, correct_predictions: 0,
    },
  };
}

// --- VCI API: fetch historical OHLCV ---

const VCI_HEADERS = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7",
  "Referer": "https://trading.vietcap.com.vn/",
  "Origin": "https://trading.vietcap.com.vn/",
  "Connection": "keep-alive",
  "Cache-Control": "no-cache",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "DNT": "1",
  "Pragma": "no-cache",
  "sec-ch-ua-platform": '"Windows"',
  "sec-ch-ua-mobile": "?0",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
};

const VCI_TRADING_URL = "https://trading.vietcap.com.vn/api";

async function fetchStockData(ticker: string): Promise<OHLCBar[]> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    timeFrame: "ONE_DAY",
    symbols: [ticker],
    to: now,
    countBack: 200,
  };

  const resp = await fetch(`${VCI_TRADING_URL}/chart/OHLCChart/gap-chart`, {
    method: "POST",
    headers: VCI_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error(`VCI API lỗi: ${resp.status}`);
  }

  const data = await resp.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Không tìm thấy dữ liệu cho mã ${ticker}`);
  }

  const item = data[0];
  const times: number[] = item.t || [];
  const opens: number[] = item.o || [];
  const highs: number[] = item.h || [];
  const lows: number[] = item.l || [];
  const closes: number[] = item.c || [];
  const volumes: number[] = item.v || [];

  const bars: OHLCBar[] = [];
  for (let i = 0; i < times.length; i++) {
    bars.push({
      t: times[i],
      o: opens[i],
      h: highs[i],
      l: lows[i],
      c: closes[i],
      v: volumes[i],
    });
  }
  return bars;
}

// --- TradingView Scanner API: fetch real-time technical indicators ---

interface TVScannerData {
  close: number;
  change: number;
  change_abs: number;
  volume: number;
  rsi: number;
  sma20: number;
  sma50: number;
  ema20: number;
  ema50: number;
  bb_upper: number;
  bb_lower: number;
  macd: number;
  macd_signal: number;
  recommend: number;
  high: number;
  low: number;
  open: number;
  high_1m: number;
  low_1m: number;
  high_3m: number;
  low_3m: number;
  high_6m: number;
  low_6m: number;
  pivot_s1: number;
  pivot_r1: number;
  pivot_s2: number;
  pivot_r2: number;
}

async function fetchTradingViewData(ticker: string): Promise<TVScannerData | null> {
  const tvBody = {
    symbols: { tickers: [`HOSE:${ticker}`], query: { types: [] } },
    columns: [
      "close", "change", "change_abs", "volume",
      "RSI",
      "SMA20", "SMA50", "EMA20", "EMA50",
      "BB.upper", "BB.lower",
      "MACD.macd", "MACD.signal",
      "Recommend.All",
      "high", "low", "open",
      "High.1M", "Low.1M", "High.3M", "Low.3M", "High.6M", "Low.6M",
      "Pivot.M.Classic.S1", "Pivot.M.Classic.R1",
      "Pivot.M.Classic.S2", "Pivot.M.Classic.R2",
    ],
  };

  try {
    const resp = await fetch("https://scanner.tradingview.com/vietnam/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(tvBody),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.data || data.data.length === 0 || !data.data[0].d) return null;

    const d = data.data[0].d;
    return {
      close: d[0],
      change: d[1],
      change_abs: d[2],
      volume: d[3],
      rsi: d[4],
      sma20: d[5],
      sma50: d[6],
      ema20: d[7],
      ema50: d[8],
      bb_upper: d[9],
      bb_lower: d[10],
      macd: d[11],
      macd_signal: d[12],
      recommend: d[13],
      high: d[14],
      low: d[15],
      open: d[16],
      high_1m: d[17],
      low_1m: d[18],
      high_3m: d[19],
      low_3m: d[20],
      high_6m: d[21],
      low_6m: d[22],
      pivot_s1: d[23],
      pivot_r1: d[24],
      pivot_s2: d[25],
      pivot_r2: d[26],
    };
  } catch {
    return null;
  }
}

async function fetchVnIndexBars(): Promise<OHLCBar[]> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    timeFrame: "ONE_DAY",
    symbols: ["VNINDEX"],
    to: now,
    countBack: 200,
  };
  try {
    const resp = await fetch(`${VCI_TRADING_URL}/chart/OHLCChart/gap-chart`, {
      method: "POST",
      headers: VCI_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return [];
    const item = data[0];
    const times: number[] = item.t || [];
    const closes: number[] = item.c || [];
    const bars: OHLCBar[] = [];
    for (let i = 0; i < times.length; i++) {
      bars.push({ t: times[i], o: closes[i], h: closes[i], l: closes[i], c: closes[i], v: 0 });
    }
    return bars;
  } catch {
    return [];
  }
}

async function fetchVnIndexData(): Promise<{ price: number; change: number; changePct: number; rsi: number }> {
  const vnBody = {
    symbols: { tickers: ["HOSE:VNINDEX"], query: { types: [] } },
    columns: ["close", "change", "change_abs", "RSI"],
  };

  try {
    const resp = await fetch("https://scanner.tradingview.com/vietnam/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(vnBody),
    });

    if (!resp.ok) throw new Error(`TV API lỗi: ${resp.status}`);
    const data = await resp.json();
    if (!data.data || data.data.length === 0 || !data.data[0].d) throw new Error("No VNINDEX data");

    const d = data.data[0].d;
    return {
      price: round2(d[0]),
      change: round2(d[2]),
      changePct: round2(d[1]),
      rsi: round2(d[3]),
    };
  } catch {
    return { price: 0, change: 0, changePct: 0, rsi: 0 };
  }
}

// --- Compute metrics: combine VCI historical + TradingView real-time ---

function computeMetrics(
  ticker: string,
  bars: OHLCBar[],
  tvData: TVScannerData | null,
  indexBars: OHLCBar[],
  forecast: MLForecast
): StockMetrics {
  const closes = bars.map(b => b.c);
  const volumes = bars.map(b => b.v);

  // Use TradingView real-time price if available, otherwise last bar close
  const current_price = tvData ? round2(tvData.close) : round2(closes[closes.length - 1]);
  const change_pct = tvData ? round2(tvData.change) : round2(((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100);

  // Use TradingView's SMA/EMA if available (more accurate), otherwise calculate from VCI data
  const ma20 = tvData && tvData.sma20 ? round2(tvData.sma20) : round2(sma(closes, 20));
  const ma50 = tvData && tvData.sma50 ? round2(tvData.sma50) : round2(sma(closes, 50));

  // Use TradingView's RSI (Wilder's method, matches standard) if available
  const rsi = tvData && tvData.rsi ? round2(tvData.rsi) : calcRSI(closes, 14);

  // Use TradingView's Bollinger Bands if available
  const bb_upper = tvData && tvData.bb_upper ? round2(tvData.bb_upper) : calcBollingerBands(closes, 20, 2).upper;
  const bb_basis = round2(sma(closes, 20));
  const bb_lower = tvData && tvData.bb_lower ? round2(tvData.bb_lower) : calcBollingerBands(closes, 20, 2).lower;

  // Volume ratio: last bar volume / avg of last 20 bars
  const avgVol20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const lastVol = tvData && tvData.volume ? tvData.volume : volumes[volumes.length - 1];
  const vol_ratio = round2(lastVol / avgVol20);

  // Support/Resistance: use TradingView Pivot points + recent swing levels
  const resistances: number[] = [];
  const supports: number[] = [];

  if (tvData) {
    // TradingView Pivot levels (most accurate)
    if (tvData.pivot_r1 && tvData.pivot_r1 > current_price) resistances.push(round2(tvData.pivot_r1));
    if (tvData.pivot_r2 && tvData.pivot_r2 > current_price) resistances.push(round2(tvData.pivot_r2));
    if (tvData.pivot_s1 && tvData.pivot_s1 < current_price) supports.push(round2(tvData.pivot_s1));
    if (tvData.pivot_s2 && tvData.pivot_s2 < current_price) supports.push(round2(tvData.pivot_s2));

    // Add recent high/low as additional levels
    if (tvData.high_1m && tvData.high_1m > current_price && !resistances.includes(round2(tvData.high_1m))) {
      resistances.push(round2(tvData.high_1m));
    }
    if (tvData.low_1m && tvData.low_1m < current_price && !supports.includes(round2(tvData.low_1m))) {
      supports.push(round2(tvData.low_1m));
    }
  }

  // If TradingView didn't provide enough levels, calculate from VCI bars
  if (resistances.length < 2) {
    // Find recent swing highs above current price
    const recentBars = bars.slice(-60);
    const swingHighs: number[] = [];
    for (let i = 2; i < recentBars.length - 2; i++) {
      if (recentBars[i].h > recentBars[i - 1].h && recentBars[i].h > recentBars[i - 2].h &&
          recentBars[i].h > recentBars[i + 1].h && recentBars[i].h > recentBars[i + 2].h) {
        if (recentBars[i].h > current_price) swingHighs.push(round2(recentBars[i].h));
      }
    }
    for (const h of swingHighs) {
      if (!resistances.includes(h)) resistances.push(h);
    }
    // Also add recent high
    const recentHigh = round2(Math.max(...bars.slice(-20).map(b => b.h)));
    if (recentHigh > current_price && !resistances.includes(recentHigh)) {
      resistances.push(recentHigh);
    }
  }

  if (supports.length < 2) {
    const recentBars = bars.slice(-60);
    const swingLows: number[] = [];
    for (let i = 2; i < recentBars.length - 2; i++) {
      if (recentBars[i].l < recentBars[i - 1].l && recentBars[i].l < recentBars[i - 2].l &&
          recentBars[i].l < recentBars[i + 1].l && recentBars[i].l < recentBars[i + 2].l) {
        if (recentBars[i].l < current_price) swingLows.push(round2(recentBars[i].l));
      }
    }
    for (const l of swingLows) {
      if (!supports.includes(l)) supports.push(l);
    }
    const recentLow = round2(Math.min(...bars.slice(-20).map(b => b.l)));
    if (recentLow < current_price && !supports.includes(recentLow)) {
      supports.push(recentLow);
    }
  }

  // Sort and take nearest 2
  resistances.sort((a, b) => a - b);
  supports.sort((a, b) => b - a);
  const finalRes = resistances.slice(0, 2);
  const finalSup = supports.slice(0, 2);

  const primarySupport = finalSup[0] || round2(current_price * 0.95);
  const primaryResistance = finalRes[0] || round2(current_price * 1.05);
  const quant = computeQuantMetrics(bars, indexBars, current_price, primarySupport, primaryResistance);

  return {
    ticker: ticker.toUpperCase(),
    current_price,
    change_pct,
    ma20,
    ma50,
    xu_huong_ngan: classifyTrend(current_price, ma20),
    xu_huong_trung: classifyTrend(current_price, ma50),
    resistances: finalRes,
    supports: finalSup,
    rsi,
    rsi_label: classifyRsi(rsi),
    bb_upper,
    bb_basis,
    bb_lower,
    vol_label: classifyVolume(vol_ratio),
    vol_ratio,
    quant,
    forecast,
  };
}

function buildAnalysis(
  m: StockMetrics,
  vnIndex: { price: number; change: number; changePct: number; rsi: number }
): AnalysisResult {
  const q = m.quant;
  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const shortUp = m.xu_huong_ngan === "Tăng";
  const midUp = m.xu_huong_trung === "Tăng";
  const overbought = m.rsi >= 70;
  const oversold = m.rsi <= 30;
  const volConfirm = m.vol_ratio >= 1.2;

  const vnindexTrend = vnIndex.changePct > 0.2 ? "Tăng" : vnIndex.changePct < -0.2 ? "Giảm" : "Đi ngang";

  let nhanDinh = "";
  if (shortUp && midUp) {
    nhanDinh = `Mã ${m.ticker} đang trong xu hướng TĂNG cả ngắn và trung hạn, giá giao dịch trên MA20 (${m.ma20}) và MA50 (${m.ma50}). `;
  } else if (!shortUp && !midUp) {
    nhanDinh = `Mã ${m.ticker} đang trong xu hướng GIẢM cả ngắn và trung hạn, giá dưới MA20 (${m.ma20}) và MA50 (${m.ma50}). `;
  } else {
    nhanDinh = `Mã ${m.ticker} có xu hướng ngắn hạn ${m.xu_huong_ngan.toUpperCase()} nhưng trung hạn ${m.xu_huong_trung.toUpperCase()}, cho thấy sự phân kỳ giữa 2 trung bình động. `;
  }
  nhanDinh += `RSI(14) ở mức ${m.rsi} (${m.rsi_label}), `;
  nhanDinh += overbought
    ? "cảnh báo vùng quá mua, cần thận trọng. "
    : oversold
      ? "đang ở vùng quá bán, có thể có cơ hội phục hồi. "
      : "nằm trong vùng trung tính. ";
  nhanDinh += volConfirm
    ? `Khối lượng giao dịch ${m.vol_ratio}x trung bình 20 phiên xác nhận cho xu hướng hiện tại.`
    : `Khối lượng giao dịch chỉ ${m.vol_ratio}x trung bình 20 phiên, chưa đủ để xác nhận mạnh xu hướng.`;

  const nhanDinhDinhLuong = `Sharpe Ratio ${q.sharpe_ratio} (${q.sharpe_ratio >= 1 ? "tốt" : q.sharpe_ratio >= 0 ? "trung bình" : "kém"}), Sortino ${q.sortino_ratio}. Volatility hàng ngày ${q.volatility_daily}%, hàng năm ${q.volatility_annual}%. Max Drawdown ${q.max_drawdown_pct}% (tương đương ${q.max_drawdown}đ). VaR(95%) = ${q.var_95}%, VaR(99%) = ${q.var_99}%. Beta ${q.beta} (${q.beta > 1.2 ? "biến động mạnh hơn thị trường" : q.beta < 0.8 ? "ít biến động hơn thị trường" : "di chuyển cùng thị trường"}). Tỷ lệ thắng ${q.win_rate}%, Profit Factor ${q.profit_factor}. Kelly ${q.kelly_pct}%, R:R = ${q.rrr}:1. Điểm rủi ro ${q.risk_score}/100 (${q.risk_label}).`;

  const f = m.forecast;
  const nhanDinhDuBao = `Mô hình ML (Linear Regression + Gradient Descent) dự báo sau ${f.forecast_days} phiên: ${f.predicted_direction} ${f.predicted_return_pct >= 0 ? "+" : ""}${f.predicted_return_pct}% (giá dự kiến ${f.predicted_price}đ). Độ tin cậy ${f.confidence}%, độ chính xác mô hình ${f.model_accuracy}%. Stop-loss đề xuất -${f.stop_loss_pct}%, take-profit +${f.take_profit_pct}%. Tổng số dự báo đã đánh giá: ${f.self_learning.evaluated_predictions}, đúng ${f.self_learning.correct_predictions}. Thưởng/phạt lũy kế: ${f.self_learning.reward_penalty >= 0 ? "+" : ""}${f.self_learning.reward_penalty}. Sai số trung bình: ${f.self_learning.avg_error}%. Lần train gần nhất đạt ${f.self_learning.last_train_accuracy}% chính xác hướng.`;

  const primaryResistance = m.resistances[0] || round2(m.current_price * 1.05);
  const secondaryResistance = m.resistances[1] || round2(m.current_price * 1.1);
  const primarySupport = m.supports[0] || round2(m.current_price * 0.95);
  const secondarySupport = m.supports[1] || round2(m.current_price * 0.9);

  let kichBanTangDieuKien = "";
  let kichBanTangHanhDong = "";
  let kichBanGiamDieuKien = "";
  let kichBanGiamHanhDong = "";

  if (shortUp || oversold) {
    kichBanTangDieuKien = `Giá vượt và giữ trên kháng cự ${primaryResistance} với khối lượng ≥1.5x trung bình 20 phiên.`;
    kichBanTangHanhDong = `Mua sát vùng hỗ trợ ${primarySupport}, mục tiêu chốt lời gần ${secondaryResistance}.`;
    kichBanGiamDieuKien = `Giá mất hỗ trợ ${primarySupport} với khối lượng tăng, phá vỡ luận điểm tăng.`;
    kichBanGiamHanhDong = `Cắt lỗ dưới ${primarySupport}, thoát toàn bộ vị thế.`;
  } else {
    kichBanTangDieuKien = `Giá quay lại trên MA20 (${m.ma20}) và thử phá kháng cự ${primaryResistance} với khối lượng xác nhận.`;
    kichBanTangHanhDong = `Mua đột phá sát ${primaryResistance} với khối lượng lớn, mục tiêu ${secondaryResistance}.`;
    kichBanGiamDieuKien = `Giá tiếp tục dưới MA20 và mất hỗ trợ ${primarySupport}, xu hướng giảm được xác nhận.`;
    kichBanGiamHanhDong = `Cắt lỗ dưới ${primarySupport}, tránh bắt đáy khi chưa có tín hiệu đảo chiều.`;
  }

  let hanhDong = "";
  let diemVao = "";
  let dungLo = "";
  let mucTieu = "";
  let tyTrong = "";

  const kellyAdjusted = Math.min(q.kelly_pct, q.position_size_pct);
  const tyTrongStr = kellyAdjusted > 0 ? `${kellyAdjusted}% vốn (Kelly ${q.kelly_pct}%, Position Sizing ${q.position_size_pct}%)` : `${q.position_size_pct}% vốn`;

  if (shortUp && midUp && !overbought) {
    hanhDong = "Gia tăng";
    diemVao = `Sát mức hỗ trợ ${primarySupport} hoặc đột phá ${primaryResistance}`;
    dungLo = `Dưới mức hỗ trợ ${primarySupport}`;
    mucTieu = `Gần mức kháng cự ${secondaryResistance}`;
    tyTrong = tyTrongStr;
  } else if (oversold) {
    hanhDong = "Mua mới";
    diemVao = `Sát mức hỗ trợ ${primarySupport}`;
    dungLo = `Dưới mức hỗ trợ ${secondarySupport}`;
    mucTieu = `Gần mức kháng cự ${primaryResistance}`;
    tyTrong = tyTrongStr;
  } else if (!shortUp && !midUp) {
    hanhDong = "Hạ tỷ trọng";
    diemVao = `Chờ tín hiệu tại hỗ trợ ${primarySupport}`;
    dungLo = `Dưới mức hỗ trợ ${secondarySupport}`;
    mucTieu = `Gần mức kháng cự ${primaryResistance}`;
    tyTrong = "Giảm về 5-10% vốn";
  } else if (overbought) {
    hanhDong = "Chốt lời một phần";
    diemVao = `Đã vào lệnh thì nắm giữ`;
    dungLo = `Dưới mức ${primaryResistance}`;
    mucTieu = `Gần mức kháng cự ${secondaryResistance}`;
    tyTrong = "Giảm 30-50% vị thế";
  } else {
    hanhDong = "Nắm giữ";
    diemVao = `Sát mức hỗ trợ ${primarySupport}`;
    dungLo = `Dưới mức hỗ trợ ${secondarySupport}`;
    mucTieu = `Gần mức kháng cự ${primaryResistance}`;
    tyTrong = tyTrongStr;
  }

  let canhBao = "";
  if (overbought) {
    canhBao = `RSI ở vùng quá mua (${m.rsi}), rủi ro điều chỉnh tăng cao. Điểm rủi ro định lượng ${q.risk_score}/100 (${q.risk_label}), VaR(95%) = ${q.var_95}%. Nếu giá mất kháng cự ${primaryResistance} hoặc khối lượng giảm đột biến, khuyến nghị chốt lời ngay.`;
  } else if (!shortUp && !midUp) {
    canhBao = `Xu hướng giảm được xác nhận. Max Drawdown lịch sử ${q.max_drawdown_pct}%, Volatility ${q.volatility_annual}%/năm. Nếu giá mất hỗ trợ ${primarySupport} với khối lượng lớn, luận điểm nắm giữ sẽ vô hiệu hóa — cần cắt giảm vị thế ngay.`;
  } else {
    canhBao = `Điểm rủi ro định lượng ${q.risk_score}/100 (${q.risk_label}). Beta ${q.beta}, VaR(95%) = ${q.var_95}%. Tin tức vĩ mô tiêu cực hoặc gãy nền kỹ thuật dưới MA50 (${m.ma50}) sẽ vô hiệu hóa khuyến nghị. Theo dõi chặt chẽ khối lượng tại các mốc hỗ trợ/kháng cự.`;
  }

  const vnTomTat = vnindexTrend === "Tăng"
    ? "VN-Index duy trì sắc thái tích cực, dòng tiền tiếp tục luân chuyển vào các nhóm cổ phiếu lớn."
    : vnindexTrend === "Giảm"
      ? "VN-Index gặp áp lực điều chỉnh, dòng tiền thận trọng và rút khỏi cổ phiếu biên độ rộng."
      : "VN-Index đi ngang, dòng tiền chờ tín hiệu rõ, tập trung vào cổ phiếu có câu chuyện riêng.";

  const nguon = ["TradingView", "VCI API (Vietcap)"];
  if (vnIndex.price > 0) nguon.push("VN-Index realtime");

  return {
    capNhat: today,
    vnindex: {
      gia: vnIndex.price > 0 ? vnIndex.price.toFixed(2) : "N/A",
      thayDoi: vnIndex.price > 0
        ? `${vnIndex.change >= 0 ? "+" : ""}${vnIndex.change} điểm (${vnIndex.changePct >= 0 ? "+" : ""}${vnIndex.changePct}%)`
        : "N/A",
      xuHuong: vnindexTrend,
      tomTat: vnTomTat,
    },
    nhanDinhKyThuat: nhanDinh,
    nhanDinhDinhLuong: nhanDinhDinhLuong,
    nhanDinhDuBao: nhanDinhDuBao,
    kichBan: [
      {
        loai: "Kịch bản Tăng",
        dieuKien: kichBanTangDieuKien,
        hanhDong: kichBanTangHanhDong,
      },
      {
        loai: "Kịch bản Giảm",
        dieuKien: kichBanGiamDieuKien,
        hanhDong: kichBanGiamHanhDong,
      },
    ],
    khuyenNghi: {
      hanhDong,
      diemVao,
      dungLo,
      mucTieu,
      tyTrong,
    },
    canhBaoRuiRo: canhBao,
    nguon,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tickerParam = url.searchParams.get("ticker");

    let ticker: string;
    if (req.method === "POST") {
      const body = await req.json();
      ticker = body.ticker;
    } else if (tickerParam) {
      ticker = tickerParam;
    } else {
      return new Response(
        JSON.stringify({ error: "Thiếu mã cổ phiếu (ticker)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ticker || ticker.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Mã cổ phiếu không hợp lệ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    ticker = ticker.toUpperCase().trim();

    // Fetch historical OHLCV from VCI + real-time indicators from TradingView (in parallel)
    const [bars, tvData, vnIndex, indexBars] = await Promise.all([
      fetchStockData(ticker),
      fetchTradingViewData(ticker),
      fetchVnIndexData(),
      fetchVnIndexBars(),
    ]);

    if (bars.length < 20) {
      return new Response(
        JSON.stringify({ error: `Không đủ dữ liệu cho mã ${ticker} (cần tối thiểu 20 phiên)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Compute ML forecast with self-learning evaluation
    const primarySupport = (tvData && tvData.pivot_s1 && tvData.pivot_s1 < (tvData.close || bars[bars.length - 1].c))
      ? round2(tvData.pivot_s1) : round2((tvData?.close || bars[bars.length - 1].c) * 0.95);
    const primaryResistance = (tvData && tvData.pivot_r1 && tvData.pivot_r1 > (tvData.close || bars[bars.length - 1].c))
      ? round2(tvData.pivot_r1) : round2((tvData?.close || bars[bars.length - 1].c) * 1.05);
    const currentPriceForForecast = tvData ? round2(tvData.close) : round2(bars[bars.length - 1].c);
    const forecast = await computeMLForecast(supabase, ticker, bars, currentPriceForForecast, primarySupport, primaryResistance);

    // Compute metrics combining both sources
    const metrics = computeMetrics(ticker, bars, tvData, indexBars, forecast);
    const analysis = buildAnalysis(metrics, vnIndex);

    const { error } = await supabase.from("stock_analyses").insert({
      ticker: metrics.ticker,
      current_price: metrics.current_price,
      change_pct: metrics.change_pct,
      ma20: metrics.ma20,
      ma50: metrics.ma50,
      xu_huong_ngan: metrics.xu_huong_ngan,
      xu_huong_trung: metrics.xu_huong_trung,
      resistances: metrics.resistances,
      supports: metrics.supports,
      rsi: metrics.rsi,
      rsi_label: metrics.rsi_label,
      bb_upper: metrics.bb_upper,
      bb_basis: metrics.bb_basis,
      bb_lower: metrics.bb_lower,
      vol_label: metrics.vol_label,
      vol_ratio: metrics.vol_ratio,
      quant_metrics: metrics.quant,
      forecast_metrics: forecast,
      analysis,
    });

    if (error) {
      console.error("DB insert error:", error.message);
    }

    return new Response(
      JSON.stringify({ metrics, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    const msg = err instanceof Error ? err.message : "Lỗi server";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
