'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import type { HoldingWithMetrics } from '@/lib/types';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { HistoryResponse } from '@/app/api/history/route';
import { calendarMidpointIdxs } from './shared';

const histFetcher = (url: string) => fetch(url).then(r => r.json());

const STOCK_RANGES = ['Today', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'MAX'] as const;
type StockRange = typeof STOCK_RANGES[number];

function fmtPrice(v: number): string {
  if (v >= 10_000) return `$${(v / 1000).toFixed(0)}k`;
  if (v >= 1_000)  return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 100)    return `$${v.toFixed(0)}`;
  if (v >= 10)     return `$${v.toFixed(1)}`;
  if (v >= 1)      return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

function fmtPriceFull(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StockPriceChart({ holdings }: { holdings: HoldingWithMetrics[]; isPrivate?: boolean }) {
  const uniqueHoldings = useMemo(
    () => [...new Map(holdings.map(h => [h.symbol, h])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [holdings],
  );

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => uniqueHoldings[0]?.symbol ?? '');
  const [range, setRange] = useState<StockRange>('Today');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tradingHoursOnly, setTradingHoursOnly] = useState(true);

  useEffect(() => {
    if (uniqueHoldings.length && !uniqueHoldings.find(h => h.symbol === selectedSymbol)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSymbol(uniqueHoldings[0].symbol);
    }
  }, [uniqueHoldings, selectedSymbol]);

  const holding = uniqueHoldings.find(h => h.symbol === selectedSymbol) ?? uniqueHoldings[0];
  const yahooSym = holding ? toYahooSymbol(holding.symbol, holding.type) : '';

  const { data, isLoading } = useSWR<HistoryResponse>(
    yahooSym ? `/api/history?symbol=${encodeURIComponent(yahooSym)}&range=${range}` : null,
    histFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0 },
  );

  const points = data?.points ?? [];

  const displayPoints = (range === 'Today' && tradingHoursOnly && points.length)
    ? points.filter(p => {
        const d = new Date(p.date);
        const [h, m] = d.toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York',
        }).split(':').map(Number);
        const em = h * 60 + m;
        return em >= 570 && em <= 960;
      })
    : points;

  if (!uniqueHoldings.length) return null;

  const W = 800, H = 300;
  const ml = 72, mr = 20, mt = 20, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = displayPoints.length;

  const firstClose = (range === 'Today' && data?.previousClose != null)
    ? data.previousClose
    : (displayPoints[0]?.close ?? 0);
  const lastClose = displayPoints[n - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const lineColor = isUp ? 'var(--color-gain)' : 'var(--color-loss)';
  const fillId = 'stockAreaGrad';

  function xOf(i: number) { return ml + (i / Math.max(n - 1, 1)) * cW; }

  const closes = displayPoints.map(p => p.close);
  const minClose = n ? Math.min(...closes) : 0;
  const maxClose = n ? Math.max(...closes) : 1;
  const pad = (maxClose - minClose) * 0.08 || maxClose * 0.05 || 1;
  const yMin = minClose >= 0 ? Math.max(minClose - pad, 0) : minClose - pad;
  const yMax = maxClose <= 0 ? Math.min(maxClose + pad, 0) : maxClose + pad;
  const yRange = yMax - yMin;

  function yOf(v: number) { return mt + cH - ((v - yMin) / yRange) * cH; }

  const linePath = n >= 2 ? displayPoints.reduce<string>((acc, p, i) => {
    return acc + (i === 0 ? `M${xOf(i)},${yOf(p.close)}` : ` L${xOf(i)},${yOf(p.close)}`);
  }, '') : '';

  const areaPath = linePath
    ? `${linePath} L${xOf(n - 1)},${mt + cH} L${xOf(0)},${mt + cH} Z`
    : '';

  const yTicks = (() => {
    const targetCount = 5;
    const rawStep = yRange / targetCount;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(rawStep), 1e-9))));
    const norm = rawStep / mag;
    let niceStep = norm <= 1 ? mag : norm <= 2 ? 2 * mag : norm <= 5 ? 5 * mag : 10 * mag;
    const midPrice = (yMin + yMax) / 2;
    const minStep = midPrice >= 10_000 ? 1_000 : midPrice >= 1_000 ? 100 : midPrice >= 100 ? 1 : midPrice >= 10 ? 0.1 : 0.01;
    niceStep = Math.max(niceStep, minStep);
    const start = Math.ceil(yMin / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let v = start; v <= yMax + niceStep * 0.01; v += niceStep) {
      ticks.push(Math.round(v * 1e9) / 1e9);
    }
    return ticks;
  })();

  function fmtXDate(d: string) {
    const dt = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
    if (range === 'Today')  return dt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/New_York' });
    if (range === '1W')     return dt.toLocaleDateString('en-US', { weekday: 'short' });
    if (range === '1M') {
      const firstMs = points.length ? new Date(points[0].date.includes('T') ? points[0].date : points[0].date + 'T12:00:00').getTime() : dt.getTime();
      const wk = Math.floor((dt.getTime() - firstMs) / (7 * 86400000)) + 1;
      return `Week ${wk}`;
    }
    if (range === '3M' || range === '6M' || range === 'YTD' || range === '1Y')
      return dt.toLocaleDateString('en-US', { month: 'short' });
    return String(dt.getFullYear());
  }

  const xLabelIdxs = (() => {
    if (n <= 1) return [0];
    if (range === 'YTD' || range === '1Y' || range === '3M' || range === '6M' || range === 'MAX' || range === '5Y') {
      const period = (range === 'MAX' || range === '5Y') ? 'year' : 'month';
      return calendarMidpointIdxs(displayPoints.map(p => p.date), period);
    }
    const count = range === '1M' ? Math.min(n, 4) : Math.min(n, 6);
    return Array.from({ length: count }, (_, i) => Math.round(i * (n - 1) / (count - 1)));
  })();

  function changeFromStart(close: number) {
    if (!firstClose) return { dollar: 0, pct: 0 };
    const dollar = close - firstClose;
    return { dollar, pct: (dollar / firstClose) * 100 };
  }

  const hovPoint = hoverIdx !== null ? displayPoints[hoverIdx] : null;

  return (
    <div className="card p-6 no-privacy">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <select
          value={selectedSymbol}
          onChange={e => { setSelectedSymbol(e.target.value); setHoverIdx(null); }}
          className="text-xs font-medium rounded-lg px-2.5 py-1 outline-none shrink-0"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          {uniqueHoldings.map(h => (
            <option key={h.symbol} value={h.symbol}>{h.symbol}</option>
          ))}
        </select>

        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {range === 'Today' && (
            <button
              onClick={() => { setTradingHoursOnly(v => !v); setHoverIdx(null); }}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0"
              style={{
                backgroundColor: tradingHoursOnly ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                color: tradingHoursOnly ? '#fff' : 'var(--color-secondary)',
              }}
            >
              Market Hours
            </button>
          )}
          {STOCK_RANGES.map(r => (
            <button
              key={r}
              onClick={() => { setRange(r); setHoverIdx(null); if (r !== 'Today') setTradingHoursOnly(false); }}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0"
              style={{
                backgroundColor: range === r ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                color: range === r ? '#fff' : 'var(--color-secondary)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Price summary */}
      {!isLoading && n >= 2 && (() => {
        const { dollar, pct } = changeFromStart(lastClose);
        const col = dollar >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';
        return (
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
              {fmtPriceFull(lastClose)}
            </span>
            <span className="text-sm font-semibold tabular-nums" style={{ color: col }}>
              {fmtPriceFull(Math.abs(dollar)).replace('$', dollar < 0 ? '-$' : '+$')}
              {' '}({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
            </span>
            <span className="text-xs text-secondary">{range} period</span>
          </div>
        );
      })()}

      {isLoading ? (
        <div className="rounded-lg animate-pulse"
          style={{ height: H, backgroundColor: 'var(--color-surface-secondary)', opacity: 0.5 }} />
      ) : n < 2 ? (
        <div style={{ height: H }} className="flex items-center justify-center text-sm text-secondary">
          No historical data available.
        </div>
      ) : (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={isUp ? '#34C759' : '#FF3B30'} stopOpacity={0.18} />
              <stop offset="100%" stopColor={isUp ? '#34C759' : '#FF3B30'} stopOpacity={0} />
            </linearGradient>
            <filter id="privacy-blur-price" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
            </filter>
          </defs>

          {yTicks.map((v, i) => (
            <line key={i}
              x1={ml} y1={yOf(v)} x2={ml + cW} y2={yOf(v)}
              stroke="var(--color-border)"
              strokeWidth={i === 0 ? 1 : 0.5}
              strokeDasharray={i === 0 ? undefined : '4 3'}
            />
          ))}
          {yTicks.map((v, i) => (
            <text key={i} x={ml - 8} y={yOf(v) + 4} textAnchor="end" fontSize={10}
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtPrice(v)}
            </text>
          ))}
          {xLabelIdxs.map(idx => (
            <text key={idx} x={xOf(idx)} y={mt + cH + 22} textAnchor="middle" fontSize={10}
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtXDate(displayPoints[idx].date)}
            </text>
          ))}

          {/* Pre/after-market shading for Today view */}
          {range === 'Today' && !tradingHoursOnly && (() => {
            const getETMin = (d: Date) => {
              const [h, m] = d.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York',
              }).split(':').map(Number);
              return h * 60 + m;
            };
            let openIdx = 0, closeIdx = n - 1;
            let dOpen = Infinity, dClose = Infinity;
            points.forEach((p, i) => {
              const em = getETMin(new Date(p.date));
              if (Math.abs(em - 570) < dOpen)  { dOpen  = Math.abs(em - 570); openIdx  = i; }
              if (Math.abs(em - 960) < dClose) { dClose = Math.abs(em - 960); closeIdx = i; }
            });
            const xOpen  = xOf(openIdx);
            const xClose = xOf(closeIdx);
            const shade = 'rgba(255,255,255,0.04)';
            const divider = 'rgba(255,255,255,0.15)';
            return (
              <g>
                {xOpen > ml + 8 && <>
                  <rect x={ml} y={mt} width={xOpen - ml} height={cH} fill={shade} />
                  <line x1={xOpen} y1={mt} x2={xOpen} y2={mt + cH} stroke={divider} strokeWidth={1} strokeDasharray="3 2" />
                </>}
                {xClose < ml + cW - 8 && <>
                  <rect x={xClose} y={mt} width={ml + cW - xClose} height={cH} fill={shade} />
                  <line x1={xClose} y1={mt} x2={xClose} y2={mt + cH} stroke={divider} strokeWidth={1} strokeDasharray="3 2" />
                </>}
              </g>
            );
          })()}

          <path d={areaPath} fill={`url(#${fillId})`} />
          <path d={linePath} fill="none" stroke={lineColor}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {hoverIdx !== null && (
            <>
              <line x1={xOf(hoverIdx)} y1={mt} x2={xOf(hoverIdx)} y2={mt + cH}
                stroke="var(--color-secondary)" strokeWidth={1} strokeDasharray="3 2" opacity={0.45} />
              <circle cx={xOf(hoverIdx)} cy={yOf(displayPoints[hoverIdx].close)} r={4}
                fill={lineColor} stroke="var(--color-surface)" strokeWidth={2} />
            </>
          )}

          <rect x={ml} y={mt} width={cW} height={cH} fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const frac = (e.clientX - rect.left) / rect.width;
              setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
            }}
            onMouseLeave={() => setHoverIdx(null)}
          />

          {hovPoint && hoverIdx !== null && (() => {
            const { dollar, pct } = changeFromStart(hovPoint.close);
            const col = dollar >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';
            const tW = 165, tH = 70;
            const tX = xOf(hoverIdx) + 12 + tW > W - mr ? xOf(hoverIdx) - tW - 12 : xOf(hoverIdx) + 12;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tX} y={mt} width={tW} height={tH} rx={7}
                  fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1} />
                <text x={tX + 10} y={mt + 17} fontSize={11} fontWeight="600"
                  style={{ fill: 'var(--color-secondary)' }}>
                  {hovPoint.date.includes('T')
                    ? new Date(hovPoint.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' })
                    : hovPoint.date}
                </text>
                <text x={tX + 10} y={mt + 36} fontSize={14} fontWeight="700"
                  style={{ fill: 'var(--color-primary)' }}>{fmtPriceFull(hovPoint.close)}</text>
                <text x={tX + 10} y={mt + 56} fontSize={11} fontWeight="600"
                  style={{ fill: col }}>
                  {fmtPriceFull(Math.abs(dollar)).replace('$', dollar < 0 ? '-$' : '+$')} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
                </text>
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
