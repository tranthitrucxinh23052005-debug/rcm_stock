import { useMemo, useRef, useState } from 'react';
import type { OHLCBar } from '@/types';
import { formatVN } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface RsiChartProps {
  bars: OHLCBar[];
  currentRsi: number;
  rsiLabel: string;
}

function calcRSISeries(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return [];
  const rsiSeries: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    if (avgLoss === 0) rsiSeries.push(100);
    else rsiSeries.push(100 - 100 / (1 + avgGain / avgLoss));
  }
  return rsiSeries;
}

export default function RsiChart({ bars, currentRsi, rsiLabel }: RsiChartProps) {
  const { theme } = useTheme();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isDark = theme === 'dark';
  const c = useMemo(() => ({
    bg: isDark ? '#0d0d0f' : '#ffffff',
    border: isDark ? '#333338' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textDim: isDark ? '#6b7280' : '#9ca3af',
    gridLine: isDark ? 'rgba(51,51,56,0.25)' : 'rgba(229,231,235,0.4)',
    rsiColor: '#e1061e',
    overbought: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.08)',
    oversold: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(5,150,105,0.08)',
  }), [isDark]);

  const layout = useMemo(() => {
    const width = 800;
    const height = 160;
    const margin = { top: 15, right: 50, bottom: 25, left: 10 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    return { width, height, margin, chartWidth, chartHeight };
  }, []);

  const { displayBars, rsiSeries } = useMemo(() => {
    if (bars.length === 0) return { displayBars: [], rsiSeries: [] };
    const displayBars = bars.slice(-40);
    const closes = bars.map(b => b.c);
    const allRsi = calcRSISeries(closes, 14);
    const startOffset = bars.length - displayBars.length;
    // Align RSI series with display bars
    const rsiOffset = allRsi.length - displayBars.length;
    const rsiSeries = rsiOffset >= 0 ? allRsi.slice(rsiOffset) : [];
    return { displayBars, rsiSeries };
  }, [bars]);

  if (bars.length === 0 || rsiSeries.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="text-sm text-muted">Không đủ dữ liệu RSI</p>
      </div>
    );
  }

  const n = displayBars.length;
  const candleWidth = layout.chartWidth / n;

  const xCenter = (i: number) => layout.margin.left + i * candleWidth + candleWidth / 2;
  const rsiToY = (rsi: number) => layout.margin.top + (1 - rsi / 100) * layout.chartHeight;

  // RSI line points
  const rsiPoints = rsiSeries.map((rsi, i) => `${xCenter(i)},${rsiToY(rsi)}`).join(' ');

  // Y-axis labels
  const yLabels = [0, 30, 50, 70, 100];

  // Date labels
  const dateLabels = displayBars.filter((_, i) => i % Math.max(1, Math.floor(n / 6)) === 0);

  const rsiValueColor = currentRsi >= 70 ? (isDark ? '#ef4444' : '#dc2626') : currentRsi <= 30 ? (isDark ? '#10b981' : '#059669') : (isDark ? '#f59e0b' : '#d97706');

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: c.rsiColor }} />
          <h4 className="text-sm font-semibold text-main">RSI (14)</h4>
          <span className="text-xs text-muted">— {rsiLabel}</span>
        </div>
        <span className="text-lg font-bold" style={{ color: rsiValueColor }}>
          {formatVN(currentRsi, 1)}
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="w-full"
          style={{ minWidth: 500 }}
          onMouseMove={(e) => {
            const svg = svgRef.current;
            if (!svg) return;
            const rect = svg.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * layout.width;
            const idx = Math.floor((x - layout.margin.left) / candleWidth);
            if (idx >= 0 && idx < n) setHoverIdx(idx);
            else setHoverIdx(null);
          }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Overbought zone (70-100) */}
          <rect x={layout.margin.left} y={rsiToY(100)} width={layout.chartWidth} height={rsiToY(70) - rsiToY(100)} fill={c.overbought} />

          {/* Oversold zone (0-30) */}
          <rect x={layout.margin.left} y={rsiToY(30)} width={layout.chartWidth} height={rsiToY(0) - rsiToY(30)} fill={c.oversold} />

          {/* Grid lines */}
          {yLabels.map((val) => (
            <g key={`rsi-grid-${val}`}>
              <line x1={layout.margin.left} y1={rsiToY(val)} x2={layout.width - layout.margin.right} y2={rsiToY(val)} stroke={c.gridLine} strokeWidth={1} strokeDasharray={val === 30 || val === 70 ? '4,4' : '2,4'} />
              <text x={layout.width - layout.margin.right + 6} y={rsiToY(val) + 4} fill={c.textDim} fontSize={10} fontFamily="'Be Vietnam Pro', sans-serif">
                {val}
              </text>
            </g>
          ))}

          {/* RSI line */}
          <polyline fill="none" stroke={c.rsiColor} strokeWidth={1.5} points={rsiPoints} />

          {/* Date labels */}
          {dateLabels.map((bar, i) => {
            const idx = displayBars.indexOf(bar);
            const x = xCenter(idx);
            const d = new Date(bar.t * 1000);
            const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            return (
              <text key={`rsi-date-${i}`} x={x} y={layout.height - 6} fill={c.textDim} fontSize={10} textAnchor="middle" fontFamily="'Be Vietnam Pro', sans-serif">
                {label}
              </text>
            );
          })}

          {/* Hover crosshair */}
          {hoverIdx !== null && hoverIdx < rsiSeries.length && (
            <line x1={xCenter(hoverIdx)} y1={layout.margin.top} x2={xCenter(hoverIdx)} y2={layout.margin.top + layout.chartHeight} stroke={c.textDim} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
          )}
        </svg>
      </div>
    </div>
  );
}
