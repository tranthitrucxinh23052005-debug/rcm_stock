import { useMemo, useRef, useState } from 'react';
import type { OHLCBar } from '@/types';
import { formatVN, formatVolume } from '@/lib/format';
import { useTheme } from '@/lib/theme';

interface PriceChartProps {
  bars: OHLCBar[];
  ma20: number;
  ma50: number;
  resistances: number[];
  supports: number[];
}

export default function PriceChart({ bars, ma20, ma50, resistances, supports }: PriceChartProps) {
  const { theme } = useTheme();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isDark = theme === 'dark';
  const c = useMemo(() => ({
    bg: isDark ? '#0d0d0f' : '#ffffff',
    surface: isDark ? '#1a1a1e' : '#f9fafb',
    border: isDark ? '#333338' : '#e5e7eb',
    text: isDark ? '#f3f4f6' : '#111827',
    textMuted: isDark ? '#9ca3af' : '#6b7280',
    textDim: isDark ? '#6b7280' : '#9ca3af',
    gridLine: isDark ? 'rgba(51,51,56,0.25)' : 'rgba(229,231,235,0.4)',
    up: isDark ? '#10b981' : '#059669',
    down: isDark ? '#ef4444' : '#dc2626',
    ssiRed: '#e1061e',
    ma20Color: '#3b82f6',
    ma50Color: '#f59e0b',
    volUp: isDark ? 'rgba(16,185,129,0.5)' : 'rgba(5,150,105,0.4)',
    volDown: isDark ? 'rgba(239,68,68,0.5)' : 'rgba(220,38,38,0.4)',
  }), [isDark]);

  const layout = useMemo(() => {
    const width = 800;
    const height = 420;
    const priceHeight = 260;
    const volHeight = 90;
    const volTop = priceHeight + 20;
    const margin = { top: 20, right: 70, bottom: 30, left: 10 };
    const chartWidth = width - margin.left - margin.right;
    return { width, height, priceHeight, volHeight, volTop, margin, chartWidth };
  }, []);

  const { priceMin, priceMax, volMax, displayBars, ma20Series, ma50Series } = useMemo(() => {
    if (bars.length === 0) return { priceMin: 0, priceMax: 0, volMax: 0, displayBars: [], ma20Series: [], ma50Series: [] };
    const displayBars = bars.slice(-40);
    const closes = displayBars.map(b => b.c);
    const lows = displayBars.map(b => b.l);
    const highs = displayBars.map(b => b.h);
    const allLevels = [...highs, ...lows, ma20, ma50, ...resistances, ...supports];
    const priceMin = Math.min(...allLevels) * 0.995;
    const priceMax = Math.max(...allLevels) * 1.005;
    const volMax = Math.max(...displayBars.map(b => b.v));

    // Compute MA series for the display window
    const allCloses = bars.map(b => b.c);
    const ma20Series: { x: number; y: number }[] = [];
    const ma50Series: { x: number; y: number }[] = [];
    const startOffset = bars.length - displayBars.length;

    for (let i = 0; i < displayBars.length; i++) {
      const globalIdx = startOffset + i;
      if (globalIdx >= 19) {
        const ma20Val = allCloses.slice(globalIdx - 19, globalIdx + 1).reduce((a, b) => a + b, 0) / 20;
        ma20Series.push({ x: i, y: ma20Val });
      }
      if (globalIdx >= 49) {
        const ma50Val = allCloses.slice(globalIdx - 49, globalIdx + 1).reduce((a, b) => a + b, 0) / 50;
        ma50Series.push({ x: i, y: ma50Val });
      }
    }

    return { priceMin, priceMax, volMax, displayBars, ma20Series, ma50Series };
  }, [bars, ma20, ma50, resistances, supports]);

  if (bars.length === 0 || displayBars.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="text-sm text-muted">Không có dữ liệu biểu đồ</p>
      </div>
    );
  }

  const n = displayBars.length;
  const candleWidth = layout.chartWidth / n;
  const candleBodyWidth = Math.max(2, candleWidth * 0.6);

  const priceToY = (price: number) => {
    const range = priceMax - priceMin || 1;
    return layout.margin.top + (1 - (price - priceMin) / range) * layout.priceHeight;
  };

  const volToY = (vol: number) => {
    const range = volMax || 1;
    return layout.volTop + layout.volHeight - (vol / range) * layout.volHeight;
  };

  const xCenter = (i: number) => layout.margin.left + i * candleWidth + candleWidth / 2;

  // Y-axis price labels (5 levels)
  const priceLabels = Array.from({ length: 5 }, (_, i) => {
    const ratio = i / 4;
    const price = priceMax - ratio * (priceMax - priceMin);
    return { price, y: layout.margin.top + ratio * layout.priceHeight };
  });

  // Date labels (every ~8 bars)
  const dateLabels = displayBars.filter((_, i) => i % Math.max(1, Math.floor(n / 6)) === 0);

  const hovered = hoverIdx !== null ? displayBars[hoverIdx] : null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: c.ssiRed }} />
          <h4 className="text-sm font-semibold text-main">Biểu đồ nến & Khối lượng</h4>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded" style={{ background: c.ma20Color }} />
            <span className="text-muted">MA20</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded" style={{ background: c.ma50Color }} />
            <span className="text-muted">MA50</span>
          </span>
        </div>
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
          {/* Grid lines (horizontal) */}
          {priceLabels.map((label, i) => (
            <line
              key={`grid-${i}`}
              x1={layout.margin.left}
              y1={label.y}
              x2={layout.width - layout.margin.right}
              y2={label.y}
              stroke={c.gridLine}
              strokeWidth={1}
              strokeDasharray="2,4"
            />
          ))}

          {/* Price labels (right axis) */}
          {priceLabels.map((label, i) => (
            <text
              key={`plabel-${i}`}
              x={layout.width - layout.margin.right + 8}
              y={label.y + 4}
              fill={c.textMuted}
              fontSize={11}
              fontFamily="'Be Vietnam Pro', sans-serif"
            >
              {formatVN(label.price)}
            </text>
          ))}

          {/* Resistance lines */}
          {resistances.slice(0, 2).map((r, i) => {
            const y = priceToY(r);
            return (
              <g key={`res-${i}`}>
                <line x1={layout.margin.left} y1={y} x2={layout.width - layout.margin.right} y2={y} stroke={c.down} strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />
                <text x={layout.margin.left + 4} y={y - 4} fill={c.down} fontSize={10} fontWeight={600}>
                  R{resistances.length - i}: {formatVN(r)}
                </text>
              </g>
            );
          })}

          {/* Support lines */}
          {supports.slice(0, 2).map((s, i) => {
            const y = priceToY(s);
            return (
              <g key={`sup-${i}`}>
                <line x1={layout.margin.left} y1={y} x2={layout.width - layout.margin.right} y2={y} stroke={c.up} strokeWidth={1} strokeDasharray="4,4" opacity={0.4} />
                <text x={layout.margin.left + 4} y={y + 12} fill={c.up} fontSize={10} fontWeight={600}>
                  S{i + 1}: {formatVN(s)}
                </text>
              </g>
            );
          })}

          {/* Candles */}
          {displayBars.map((bar, i) => {
            const x = xCenter(i);
            const isUp = bar.c >= bar.o;
            const color = isUp ? c.up : c.down;
            const yHigh = priceToY(bar.h);
            const yLow = priceToY(bar.l);
            const yOpen = priceToY(bar.o);
            const yClose = priceToY(bar.c);
            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
            return (
              <g key={`candle-${i}`}>
                <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth={1} />
                <rect
                  x={x - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={color}
                  rx={1}
                />
              </g>
            );
          })}

          {/* MA20 line */}
          {ma20Series.length > 1 && (
            <polyline
              fill="none"
              stroke={c.ma20Color}
              strokeWidth={1.5}
              points={ma20Series.map(p => `${xCenter(p.x)},${priceToY(p.y)}`).join(' ')}
            />
          )}

          {/* MA50 line */}
          {ma50Series.length > 1 && (
            <polyline
              fill="none"
              stroke={c.ma50Color}
              strokeWidth={1.5}
              points={ma50Series.map(p => `${xCenter(p.x)},${priceToY(p.y)}`).join(' ')}
            />
          )}

          {/* Volume separator */}
          <line x1={layout.margin.left} y1={layout.volTop} x2={layout.width - layout.margin.right} y2={layout.volTop} stroke={c.border} strokeWidth={1} />

          {/* Volume bars */}
          {displayBars.map((bar, i) => {
            const x = xCenter(i);
            const isUp = bar.c >= bar.o;
            const y = volToY(bar.v);
            const h = layout.volTop + layout.volHeight - y;
            return (
              <rect
                key={`vol-${i}`}
                x={x - candleBodyWidth / 2}
                y={y}
                width={candleBodyWidth}
                height={Math.max(1, h)}
                fill={isUp ? c.volUp : c.volDown}
                rx={1}
              />
            );
          })}

          {/* Volume label */}
          <text x={layout.margin.left + 4} y={layout.volTop + 14} fill={c.textDim} fontSize={10} fontWeight={600}>
            Khối lượng
          </text>

          {/* Date labels (bottom) */}
          {dateLabels.map((bar, i) => {
            const idx = displayBars.indexOf(bar);
            const x = xCenter(idx);
            const d = new Date(bar.t * 1000);
            const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            return (
              <text key={`date-${i}`} x={x} y={layout.height - 8} fill={c.textDim} fontSize={10} textAnchor="middle" fontFamily="'Be Vietnam Pro', sans-serif">
                {label}
              </text>
            );
          })}

          {/* Hover crosshair */}
          {hoverIdx !== null && hovered && (
            <line
              x1={xCenter(hoverIdx)}
              y1={layout.margin.top}
              x2={xCenter(hoverIdx)}
              y2={layout.volTop + layout.volHeight}
              stroke={c.textDim}
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.5}
            />
          )}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div className="absolute top-1 right-2 px-3 py-2 rounded-lg border border-default bg-surface text-xs space-y-0.5 pointer-events-none" style={{ zIndex: 10 }}>
            <div className="text-muted">{new Date(hovered.t * 1000).toLocaleDateString('vi-VN')}</div>
            <div className="flex gap-3"><span className="text-dim">O:</span><span className="font-medium text-main">{formatVN(hovered.o)}</span></div>
            <div className="flex gap-3"><span className="text-dim">H:</span><span className="font-medium" style={{ color: c.up }}>{formatVN(hovered.h)}</span></div>
            <div className="flex gap-3"><span className="text-dim">L:</span><span className="font-medium" style={{ color: c.down }}>{formatVN(hovered.l)}</span></div>
            <div className="flex gap-3"><span className="text-dim">C:</span><span className="font-medium text-main">{formatVN(hovered.c)}</span></div>
            <div className="flex gap-3"><span className="text-dim">KL:</span><span className="font-medium text-main">{formatVolume(hovered.v)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
