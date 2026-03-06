'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { formatCurrencyK } from '@/lib/formatters';
import type { HoldingWithMetrics, DailySnapshot } from '@/lib/types';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { HistoryPoint, HistoryResponse } from '@/app/api/history/route';

const COLORS = [
  '#0071E3', '#34C759', '#FF9500', '#AF52DE', '#FF3B30',
  '#5AC8FA', '#FFCC00', '#FF2D55', '#32ADE6', '#30D158',
];

interface Slice {
  industry: string;
  count: number;
  value: number;
  percent: number;
  dailyChange: number;
  dailyChangePct: number;
  totalGain: number;
  totalGainPct: number;
  totalCost: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number, outerR: number, innerR: number,
  startAngle: number, endAngle: number,
) {
  const sweep = Math.min(endAngle - startAngle, 359.999);
  const end = sweep >= 359.999 ? startAngle + 359.999 : endAngle;
  const oS = polarToCartesian(cx, cy, outerR, startAngle);
  const oE = polarToCartesian(cx, cy, outerR, end);
  const iS = polarToCartesian(cx, cy, innerR, startAngle);
  const iE = polarToCartesian(cx, cy, innerR, end);
  const large = sweep > 180 ? 1 : 0;
  return `M ${oS.x} ${oS.y} A ${outerR} ${outerR} 0 ${large} 1 ${oE.x} ${oE.y} L ${iE.x} ${iE.y} A ${innerR} ${innerR} 0 ${large} 0 ${iS.x} ${iS.y} Z`;
}

function sign(v: number) { return v >= 0 ? '+' : ''; }
function fmtMoney(v: number) {
  const abs = Math.abs(v);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
  return `${v < 0 ? '-' : '+'}${s}`;
}
function fmtMoneyFull(v: number) {
  const abs = Math.abs(v);
  return `${v < 0 ? '-' : '+'}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(v: number) { return `${sign(v)}${v.toFixed(2)}%`; }

// ─── Unified trend chart ─────────────────────────────────────────────────────

const snapshotFetcher = (url: string) => fetch(url).then(r => r.json());

// Place x-axis labels at the calendar midpoint of each period (15th for months,
// July 1 for years), skipping periods whose midpoint falls outside the data range.
// This ensures equal visual spacing regardless of partial periods at the edges.
function calendarMidpointIdxs(dates: string[], period: 'month' | 'year'): number[] {
  const sliceTo = period === 'year' ? 4 : 7;
  const midSuffix = period === 'year' ? '-07-01' : '-15';
  const unique = [...new Set(dates.map(d => d.slice(0, sliceTo)))];
  const first = dates[0].slice(0, 10);
  const last = dates[dates.length - 1].slice(0, 10);
  return unique
    .map(key => `${key}${midSuffix}`)
    .filter(mid => mid >= first && mid <= last)
    .map(mid => {
      let bestIdx = 0, bestDist = Infinity;
      dates.forEach((d, i) => {
        const dist = Math.abs(
          new Date(d.slice(0, 10) + 'T12:00:00').getTime() -
          new Date(mid + 'T12:00:00').getTime(),
        );
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      return bestIdx;
    });
}

type ChartMode = 'value' | 'gain' | 'return';

const CHART_MODES: { id: ChartMode; label: string }[] = [
  { id: 'value',  label: 'Portfolio Trend' },
  { id: 'gain',   label: 'Total G/L' },
  { id: 'return', label: 'Total Return %' },
];

function rangeLabel(r: string): string {
  const map: Record<string, string> = {
    today: 'Today', '1w': '1W', '1m': '1M', '3m': '3M', '6m': '6M', ytd: 'YTD', max: 'MAX',
  };
  if (map[r]) return map[r];
  if (/^\d{4}$/.test(r)) return `${r.slice(2)}'`;
  return r;
}

function filterByTimeRange(snaps: DailySnapshot[], range: string): DailySnapshot[] {
  if (range === 'max') return snaps;
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const dateStr = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

  if (range === 'today') {
    const today = dateStr(now);
    return snaps.filter(s => s.date === today);
  }
  if (range === '1w') {
    const cutoff = new Date(now); cutoff.setDate(now.getDate() - 7);
    return snaps.filter(s => s.date >= dateStr(cutoff));
  }
  if (range === '1m') {
    const cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1);
    return snaps.filter(s => s.date >= dateStr(cutoff));
  }
  if (range === '3m') {
    const cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3);
    return snaps.filter(s => s.date >= dateStr(cutoff));
  }
  if (range === '6m') {
    const cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 6);
    return snaps.filter(s => s.date >= dateStr(cutoff));
  }
  if (range === 'ytd') return snaps.filter(s => s.date >= `${now.getFullYear()}-01-01`);
  // year e.g. '2024'
  return snaps.filter(s => s.date.startsWith(range));
}

interface TrendChartProps { industryColors: Map<string, string>; enabled: Set<string>; }

function TrendChart({ industryColors, enabled }: TrendChartProps) {
  const [mode, setMode] = useState<ChartMode>('value');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>('ytd');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const check = () => setIsPrivate(document.documentElement.classList.contains('privacy-mode'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const { data } = useSWR<{ snapshots: DailySnapshot[] }>(
    '/api/portfolio/snapshots?days=3650',
    snapshotFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0 },
  );

  const snapshots = useMemo(() => data?.snapshots ?? [], [data]);

  const years = useMemo(
    () => [...new Set(snapshots.map(s => s.date.slice(0, 4)))].sort(),
    [snapshots],
  );

  const filtered = useMemo(
    () => filterByTimeRange(snapshots, timeRange),
    [snapshots, timeRange],
  );

  if (!data) {
    return (
      <div className="card p-6">
        <div className="h-6 w-40 rounded mb-5" style={{ backgroundColor: 'var(--color-surface-secondary)' }} />
        <div className="rounded-lg" style={{ height: 300, backgroundColor: 'var(--color-surface-secondary)', opacity: 0.5 }} />
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="card p-6">
        <p className="text-sm text-secondary text-center py-14">
          {snapshots.length === 0
            ? 'No historical data yet — snapshots are recorded automatically each time you refresh quotes.'
            : 'Need at least 2 data points. Come back after the next quote refresh.'}
        </p>
      </div>
    );
  }

  // ── Derive values per mode ──
  const returnVals = filtered.map(s => s.totalCost > 0 ? (s.totalGain / s.totalCost) * 100 : null);
  const mainVals: (number | null)[] = mode === 'value'
    ? filtered.map(s => s.totalValue)
    : mode === 'gain'
    ? filtered.map(s => s.totalGain)
    : returnVals;

  const definedMain = mainVals.filter((v): v is number => v !== null);
  if (definedMain.length < 2) {
    return (
      <div className="card p-6">
        <p className="text-sm text-secondary text-center py-10">No data for the selected period.</p>
      </div>
    );
  }

  // ── SVG layout ──
  const W = 800, H = 300;
  const ml = 84, mr = 20, mt = 16, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = filtered.length;

  function xOf(i: number) { return ml + (i / (n - 1)) * cW; }

  const showIndustryOverlays = mode !== 'return';
  const hasSelectedIndustry = enabled.size > 0;

  // When an industry is selected, scale the y-axis to that industry's data only
  const industryVals = showIndustryOverlays
    ? filtered.flatMap(s => [...enabled].map(ind => s.byIndustry[ind]?.totalGain ?? 0))
    : [];
  const allVals = hasSelectedIndustry && industryVals.length > 0
    ? industryVals
    : [...definedMain, ...industryVals];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.05 || 1;
  // Don't pad into negative territory when all data is positive (and vice versa)
  const yMin = rawMin >= 0 ? Math.max(rawMin - pad, 0) : rawMin - pad;
  const yMax = rawMax <= 0 ? Math.min(rawMax + pad, 0) : rawMax + pad;
  const yRange = yMax - yMin;

  function yOf(v: number) { return mt + cH - ((v - yMin) / yRange) * cH; }

  function makePath(vals: (number | null)[]) {
    return vals.reduce<string>((acc, v, i) => {
      if (v === null) return acc;
      const x = xOf(i), y = yOf(v);
      const cmd = acc === '' || vals[i - 1] === null ? `M${x},${y}` : ` L${x},${y}`;
      return acc + cmd;
    }, '');
  }

  function fmtY(v: number) {
    if (mode === 'return') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const abs = Math.abs(v);
    // Gain mode or industry-selected (which always shows G/L): use adaptive +/- prefix
    if (mode === 'gain' || hasSelectedIndustry) {
      const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}m`
        : abs >= 1_000 ? `$${(abs / 1_000).toFixed(0)}k`
        : `$${abs.toFixed(0)}`;
      return `${v < 0 ? '-' : '+'}${s}`;
    }
    // Value mode — adaptive scale
    const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000 ? `$${(abs / 1_000).toFixed(1)}k`
      : `$${abs.toFixed(0)}`;
    return v < 0 ? `-${s}` : s;
  }

  function fmtFull(v: number) {
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const lastMain = definedMain[definedMain.length - 1] ?? 0;
  const lineColor = mode === 'value'
    ? 'var(--color-accent)'
    : mode === 'return'
    ? '#AF52DE'
    : lastMain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';

  const mainPath = makePath(mainVals);

  // Industry-combined G/L series for period summary when industries are selected
  const industryGainSeries = hasSelectedIndustry && filtered.length > 0
    ? filtered.map(s => [...enabled].reduce((sum, ind) => sum + (s.byIndustry[ind]?.totalGain ?? 0), 0))
    : null;

  // Generate "nice" y-axis ticks (e.g. multiples of 50, 100, 500, 1k …)
  const yTicks = (() => {
    const targetCount = 5;
    const rawStep = yRange / targetCount;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(rawStep), 1e-9))));
    const norm = rawStep / mag;
    const niceStep = norm <= 1 ? mag : norm <= 2 ? 2 * mag : norm <= 5 ? 5 * mag : 10 * mag;
    const start = Math.ceil(yMin / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let v = start; v <= yMax + niceStep * 0.01; v += niceStep) {
      ticks.push(Math.round(v * 1e9) / 1e9);
    }
    return ticks;
  })();

  function midpointsByKey(keyFn: (s: DailySnapshot) => string): number[] {
    const groups = new Map<string, { first: number; last: number }>();
    filtered.forEach((s, i) => {
      const k = keyFn(s);
      const g = groups.get(k);
      groups.set(k, g ? { first: g.first, last: i } : { first: i, last: i });
    });
    return [...groups.values()].map(({ first, last }) => Math.round((first + last) / 2));
  }

  const xLabelIdxs = (() => {
    const dates = filtered.map(s => s.date);
    if (timeRange === 'max')
      return calendarMidpointIdxs(dates, 'year');
    if (/^\d{4}$/.test(timeRange))
      return calendarMidpointIdxs(dates, 'month');
    if (timeRange === 'today' || timeRange === '1w')
      return midpointsByKey(s => s.date);
    if (timeRange === '1m') {
      const firstMs = filtered.length ? new Date(filtered[0].date + 'T12:00:00').getTime() : 0;
      return midpointsByKey(s => {
        const wk = Math.floor((new Date(s.date + 'T12:00:00').getTime() - firstMs) / (7 * 86400000)) + 1;
        return `week-${wk}`;
      });
    }
    if (timeRange === '3m' || timeRange === '6m' || timeRange === 'ytd')
      return calendarMidpointIdxs(dates, 'month');
    const labelCount = Math.min(n, 7);
    return Array.from({ length: labelCount }, (_, i) =>
      Math.round(i * (n - 1) / (labelCount - 1)),
    );
  })();
  function fmtDate(d: string) {
    const dt = new Date(d + 'T12:00:00');
    if (timeRange === 'today')
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (timeRange === '1w')
      return dt.toLocaleDateString('en-US', { weekday: 'short' });
    if (timeRange === '1m') {
      const firstMs = filtered.length ? new Date(filtered[0].date + 'T12:00:00').getTime() : dt.getTime();
      const wk = Math.floor((dt.getTime() - firstMs) / (7 * 86400000)) + 1;
      return `Week ${wk}`;
    }
    if (timeRange === '3m' || timeRange === '6m' || timeRange === 'ytd')
      return dt.toLocaleDateString('en-US', { month: 'short' });
    if (/^\d{4}$/.test(timeRange))
      return dt.toLocaleDateString('en-US', { month: 'short' });
    return String(dt.getFullYear());
  }

  const hovSnap = hoverIdx !== null ? filtered[hoverIdx] : null;
  const hovMain = hoverIdx !== null ? mainVals[hoverIdx] : null;

  // Period change: use industry G/L series when selected, else main vals
  const firstMain = mainVals.find((v): v is number => v !== null) ?? 0;
  const displayLast = industryGainSeries ? industryGainSeries[industryGainSeries.length - 1] : lastMain;
  const displayFirst = industryGainSeries ? industryGainSeries[0] : firstMain;
  const periodChange = displayLast - displayFirst;
  const periodChangePct = displayFirst !== 0 ? (periodChange / Math.abs(displayFirst)) * 100 : 0;
  const periodColor = periodChange >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';

  function fmtPeriodValue(v: number) {
    if (mode === 'return') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    if (mode === 'gain') {
      return `${v < 0 ? '-' : '+'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    const abs = Math.abs(v);
    return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`;
  }

  function fmtPeriodChange(delta: number, pct: number) {
    if (mode === 'return') {
      // delta is already in percentage points
      return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} pp`;
    }
    const abs = Math.abs(delta);
    const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `$${(abs / 1_000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
    return `${delta >= 0 ? '+' : '-'}${s} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
  }

  return (
    <div className="card p-6">
      {/* Controls row: mode toggles + time range pills in one line */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <select
          value={mode}
          onChange={e => setMode(e.target.value as ChartMode)}
          className="text-xs font-medium rounded-lg px-2.5 py-1 outline-none shrink-0"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          {CHART_MODES.map(({ id, label }) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['1w', '1m', '3m', '6m', 'ytd', ...years, 'max'] as string[]).map(r => (
            <button
              key={r}
              onClick={() => { setTimeRange(r); setHoverIdx(null); }}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0"
              style={{
                backgroundColor: timeRange === r ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                color: timeRange === r ? '#fff' : 'var(--color-secondary)',
              }}
            >
              {rangeLabel(r)}
            </button>
          ))}
        </div>
      </div>

      {/* Period summary */}
      <div
        className="flex items-baseline gap-3 mb-3"
        style={{
          filter: isPrivate ? 'blur(8px)' : 'none',
          transition: 'filter 0.2s',
          userSelect: isPrivate ? 'none' : undefined,
        }}
      >
        <span className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
          {industryGainSeries ? fmtMoney(periodChange) : fmtPeriodValue(lastMain)}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color: periodColor }}>
          {industryGainSeries
            ? `(${periodChangePct >= 0 ? '+' : ''}${periodChangePct.toFixed(2)}%)`
            : fmtPeriodChange(periodChange, periodChangePct)}
        </span>
        <span className="text-xs text-secondary">{rangeLabel(timeRange)}</span>
      </div>

      {/* SVG line chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <filter id="privacy-blur-trend" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line key={i}
            x1={ml} y1={yOf(v)} x2={ml + cW} y2={yOf(v)}
            stroke="var(--color-border)"
            strokeWidth={i === 0 ? 1 : 0.5}
            strokeDasharray={i === 0 ? undefined : '4 3'}
          />
        ))}

        {/* Y labels */}
        {yTicks.map((v, i) => (
          <text key={i} x={ml - 8} y={yOf(v) + 4} textAnchor="end" fontSize={10}
            filter={isPrivate ? 'url(#privacy-blur-trend)' : undefined}
            style={{ fill: 'var(--color-secondary)' }}>
            {fmtY(v)}
          </text>
        ))}

        {/* Zero line (gain/return modes, or when industry selected, if crosses zero) */}
        {(mode !== 'value' || hasSelectedIndustry) && yMin < 0 && yMax > 0 && (
          <line x1={ml} y1={yOf(0)} x2={ml + cW} y2={yOf(0)}
            stroke="var(--color-secondary)" strokeWidth={1} opacity={0.3} />
        )}

        {/* X-axis labels */}
        {xLabelIdxs.map(idx => (
          <text key={idx} x={xOf(idx)} y={mt + cH + 22} textAnchor="middle" fontSize={10}
            style={{ fill: 'var(--color-secondary)' }}>
            {fmtDate(filtered[idx].date)}
          </text>
        ))}

        {/* Industry G/L overlay lines */}
        {showIndustryOverlays && [...enabled].map(ind => {
          const color = industryColors.get(ind) ?? '#888';
          const path = makePath(filtered.map(s => s.byIndustry[ind]?.totalGain ?? null));
          if (!path) return null;
          return (
            <path key={ind} d={path} fill="none" stroke={color}
              strokeWidth={hasSelectedIndustry ? 2.5 : 1.5}
              strokeDasharray={hasSelectedIndustry ? undefined : '5 3'}
              strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          );
        })}

        {/* Main line — hidden when a specific industry is selected */}
        {!hasSelectedIndustry && (
          <path d={mainPath} fill="none" stroke={lineColor}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <line x1={xOf(hoverIdx)} y1={mt} x2={xOf(hoverIdx)} y2={mt + cH}
            stroke="var(--color-secondary)" strokeWidth={1} strokeDasharray="3 2" opacity={0.45} />
        )}

        {/* Hit area */}
        <rect x={ml} y={mt} width={cW} height={cH} fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const frac = (e.clientX - r.left) / r.width;
            setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
          }}
          onMouseLeave={() => setHoverIdx(null)}
        />

        {/* Tooltip */}
        {hovSnap && hoverIdx !== null && hovMain !== null && (() => {
          const enabledArr = showIndustryOverlays ? [...enabled] : [];
          const tooltipLines: { label: string; value: string; color: string }[] = [
            // Hide the total-portfolio line when a specific industry is selected
            ...(!hasSelectedIndustry ? [{
              label: mode === 'value' ? 'Total Value' : mode === 'gain' ? 'Total G/L' : 'Return',
              value: mode === 'value'
                ? fmtFull(hovSnap.totalValue)
                : mode === 'gain'
                ? fmtMoneyFull(hovSnap.totalGain)
                : fmtY(hovMain),
              color: mode === 'value'
                ? 'var(--color-accent)'
                : mode === 'return'
                ? '#AF52DE'
                : hovMain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)',
            }] : []),
            ...enabledArr.map(ind => ({
              label: `${ind} G/L`,
              value: fmtMoneyFull(hovSnap.byIndustry[ind]?.totalGain ?? 0),
              color: industryColors.get(ind) ?? '#888',
            })),
          ];
          const tW = 180;
          const tH = tooltipLines.length * 19 + 32;
          const tX = xOf(hoverIdx) + 12 + tW > W - mr ? xOf(hoverIdx) - tW - 12 : xOf(hoverIdx) + 12;
          const tY = mt;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tX} y={tY} width={tW} height={tH} rx={7}
                fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1} />
              <text x={tX + 10} y={tY + 17} fontSize={11} fontWeight="600"
                style={{ fill: 'var(--color-secondary)' }}>{hovSnap.date}</text>
              {tooltipLines.map((l, i) => (
                <g key={i}>
                  <text x={tX + 10} y={tY + 32 + i * 19} fontSize={11}
                    style={{ fill: 'var(--color-secondary)' }}>{l.label}</text>
                  <text x={tX + tW - 10} y={tY + 32 + i * 19} fontSize={11} fontWeight="700"
                    textAnchor="end" style={{ fill: l.color }}>{l.value}</text>
                </g>
              ))}
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ─── Stock price trend chart ─────────────────────────────────────────────────

const STOCK_RANGES = ['Today', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'MAX'] as const;
type StockRange = typeof STOCK_RANGES[number];

const histFetcher = (url: string) => fetch(url).then(r => r.json());

// Compact format for axis labels
function fmtPrice(v: number): string {
  if (v >= 10_000) return `$${(v / 1000).toFixed(0)}k`;
  if (v >= 1_000)  return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 100)    return `$${v.toFixed(0)}`;
  if (v >= 10)     return `$${v.toFixed(1)}`;
  if (v >= 1)      return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

// Full precision (2 dp) for summary row and tooltip
function fmtPriceFull(v: number): string {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StockPriceChart({ holdings, isPrivate }: { holdings: HoldingWithMetrics[]; isPrivate: boolean }) {
  const uniqueHoldings = useMemo(
    () => [...new Map(holdings.map(h => [h.symbol, h])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [holdings],
  );

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => uniqueHoldings[0]?.symbol ?? '');
  const [range, setRange] = useState<StockRange>('Today');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tradingHoursOnly, setTradingHoursOnly] = useState(true);

  // Keep selectedSymbol valid when holdings change
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

  // ── SVG layout ──
  const W = 800, H = 300;
  const ml = 72, mr = 20, mt = 20, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = displayPoints.length;

  // For "Today", use previous trading day's close as baseline (matches Daily Change in table).
  // For other ranges, use the first data point in the period.
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

  // Nice y-axis ticks
  const yTicks = (() => {
    const targetCount = 5;
    const rawStep = yRange / targetCount;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(Math.abs(rawStep), 1e-9))));
    const norm = rawStep / mag;
    let niceStep = norm <= 1 ? mag : norm <= 2 ? 2 * mag : norm <= 5 ? 5 * mag : 10 * mag;
    // Enforce minimum step matching fmtPrice display precision to prevent duplicate labels
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
    // Intraday dates are full ISO timestamps; daily dates are YYYY-MM-DD
    const dt = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
    if (range === 'Today')                 return dt.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true, timeZone: 'America/New_York' });
    if (range === '1W')                    return dt.toLocaleDateString('en-US', { weekday: 'short' });
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

          {/* Grid lines */}
          {yTicks.map((v, i) => (
            <line key={i}
              x1={ml} y1={yOf(v)} x2={ml + cW} y2={yOf(v)}
              stroke="var(--color-border)"
              strokeWidth={i === 0 ? 1 : 0.5}
              strokeDasharray={i === 0 ? undefined : '4 3'}
            />
          ))}

          {/* Y labels */}
          {yTicks.map((v, i) => (
            <text key={i} x={ml - 8} y={yOf(v) + 4} textAnchor="end" fontSize={10}
              filter={isPrivate ? 'url(#privacy-blur-price)' : undefined}
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtPrice(v)}
            </text>
          ))}

          {/* X labels */}
          {xLabelIdxs.map(idx => (
            <text key={idx} x={xOf(idx)} y={mt + cH + 22} textAnchor="middle" fontSize={10}
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtXDate(displayPoints[idx].date)}
            </text>
          ))}

          {/* Pre/after-market shading for Today view (hidden when trading hours filter is on) */}
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
              if (Math.abs(em - 570) < dOpen)  { dOpen  = Math.abs(em - 570); openIdx  = i; } // 9:30
              if (Math.abs(em - 960) < dClose) { dClose = Math.abs(em - 960); closeIdx = i; } // 16:00
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

          {/* Area fill */}
          <path d={areaPath} fill={`url(#${fillId})`} />

          {/* Price line */}
          <path d={linePath} fill="none" stroke={lineColor}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover crosshair + dot */}
          {hoverIdx !== null && (
            <>
              <line x1={xOf(hoverIdx)} y1={mt} x2={xOf(hoverIdx)} y2={mt + cH}
                stroke="var(--color-secondary)" strokeWidth={1} strokeDasharray="3 2" opacity={0.45} />
              <circle cx={xOf(hoverIdx)} cy={yOf(displayPoints[hoverIdx].close)} r={4}
                fill={lineColor} stroke="var(--color-surface)" strokeWidth={2} />
            </>
          )}

          {/* Hit area */}
          <rect x={ml} y={mt} width={cW} height={cH} fill="transparent"
            style={{ cursor: 'crosshair' }}
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const frac = (e.clientX - rect.left) / rect.width;
              setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
            }}
            onMouseLeave={() => setHoverIdx(null)}
          />

          {/* Tooltip */}
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

// ─── Main component ──────────────────────────────────────────────────────────

interface Props { holdings: HoldingWithMetrics[]; }

export default function ChartsView({ holdings }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const check = () => setIsPrivate(document.documentElement.classList.contains('privacy-mode'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  function toggleIndustry(industry: string) {
    setSelectedIndustries(prev => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(industry) ? next.delete(industry) : next.add(industry);
      return next;
    });
  }

  const slices = useMemo((): Slice[] => {
    const map = new Map<string, { value: number; dailyChange: number; totalGain: number; totalCost: number; symbols: Set<string> }>();
    for (const h of holdings) {
      const key = h.industry?.trim() || 'Other';
      const p = map.get(key) ?? { value: 0, dailyChange: 0, totalGain: 0, totalCost: 0, symbols: new Set() };
      p.symbols.add(h.symbol);
      map.set(key, { value: p.value + h.currentValue, dailyChange: p.dailyChange + h.dailyChange, totalGain: p.totalGain + h.totalGain, totalCost: p.totalCost + h.totalCost, symbols: p.symbols });
    }
    const total = [...map.values()].reduce((s, v) => s + v.value, 0);
    const sorted = [...map.entries()].sort(([, a], [, b]) => b.value - a.value);
    let angle = 0;
    return sorted.map(([industry, d], i) => {
      const percent = (d.value / total) * 100;
      const sweep = (percent / 100) * 360;
      const s: Slice = {
        industry, percent, color: COLORS[i % COLORS.length],
        count: d.symbols.size,
        value: d.value, dailyChange: d.dailyChange,
        dailyChangePct: (d.value - d.dailyChange) > 0 ? (d.dailyChange / (d.value - d.dailyChange)) * 100 : 0,
        totalGain: d.totalGain,
        totalGainPct: d.totalCost > 0 ? (d.totalGain / d.totalCost) * 100 : 0,
        totalCost: d.totalCost,
        startAngle: angle, endAngle: angle + sweep,
      };
      // eslint-disable-next-line react-hooks/immutability
      angle += sweep;
      return s;
    });
  }, [holdings]);

  const industryColors = useMemo(
    () => new Map(slices.map(s => [s.industry, s.color])),
    [slices],
  );

  const cx = 180, cy = 180, outerR = 150, innerR = 87;
  const hoveredSlice = slices.find(s => s.industry === hovered);

  return (
    <div className="space-y-4">
      {/* ── Industry distribution donut ── */}
      <div className="card p-4 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">
            Industry Distribution
          </h2>
          {selectedIndustries.size > 0 && (
            <button
              onClick={() => setSelectedIndustries(new Set())}
              className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">

          {/* ── Donut chart ── */}
          <div className="shrink-0 w-full max-w-[280px] md:w-[324px]">
            <svg width="100%" viewBox="0 0 360 360" style={{ display: 'block' }}>
              <defs>
                <filter id="privacy-blur-donut" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
                </filter>
              </defs>
              {slices.map((slice) => {
                const selected = selectedIndustries.has(slice.industry);
                return (
                  <path
                    key={slice.industry}
                    d={donutSlicePath(cx, cy, outerR, innerR, slice.startAngle, slice.endAngle)}
                    fill={slice.color}
                    opacity={hovered === null || hovered === slice.industry ? 1 : 0.2}
                    stroke={selected ? '#fff' : 'none'}
                    strokeWidth={selected ? 2.5 : 0}
                    style={{ transition: 'opacity 0.15s', cursor: 'pointer' }}
                    onMouseEnter={() => setHovered(slice.industry)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => toggleIndustry(slice.industry)}
                  />
                );
              })}
              {/* Centre label */}
              {hoveredSlice ? (
                <>
                  <text x={cx} y={cy - 15} textAnchor="middle" fontSize={14} style={{ fill: 'var(--color-secondary)' }}>{hoveredSlice.industry}</text>
                  <text x={cx} y={cy + 10} textAnchor="middle" fontSize={24} fontWeight="700" style={{ fill: 'var(--color-primary)' }}>{hoveredSlice.percent.toFixed(1)}%</text>
                  <text x={cx} y={cy + 32} textAnchor="middle" fontSize={14}
                    filter={isPrivate ? 'url(#privacy-blur-donut)' : undefined}
                    style={{ fill: 'var(--color-secondary)' }}
                  >{formatCurrencyK(hoveredSlice.value)}</text>
                </>
              ) : (
                <>
                  <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={14} style={{ fill: 'var(--color-secondary)' }}>Industries</text>
                  <text x={cx} y={cy + 20} textAnchor="middle" fontSize={30} fontWeight="700" style={{ fill: 'var(--color-primary)' }}>{slices.length}</text>
                </>
              )}
            </svg>
          </div>

          {/* ── Legend table ── */}
          <div className="flex-1 min-w-0 w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left pb-2 pr-2 md:pr-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Industry</th>
                  <th className="hidden sm:table-cell text-center pb-2 px-2 md:px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Cost</th>
                  <th className="text-center pb-2 px-2 md:px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Value</th>
                  <th className="text-center pb-2 px-2 md:px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Daily</th>
                  <th className="text-center pb-2 pl-2 md:pl-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Total G/L</th>
                </tr>
              </thead>
              <tbody>
                {slices.map((slice) => {
                  const dimmed = hovered !== null && hovered !== slice.industry;
                  const dailyColor = slice.dailyChange >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';
                  const gainColor  = slice.totalGain  >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';
                  return (
                    <tr
                      key={slice.industry}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        opacity: dimmed ? 0.3 : 1,
                        transition: 'opacity 0.15s',
                        cursor: 'pointer',
                        backgroundColor: selectedIndustries.has(slice.industry)
                          ? slice.color + '18'
                          : hovered === slice.industry ? 'var(--color-surface-secondary)' : 'transparent',
                      }}
                      onMouseEnter={() => setHovered(slice.industry)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => toggleIndustry(slice.industry)}
                    >
                      {/* Industry name */}
                      <td className="py-1.5 pr-2 md:pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="text-xs md:text-sm font-medium text-primary">{slice.industry}</span>
                          <span className="text-[10px] md:text-xs font-semibold tabular-nums" style={{ color: slice.color }}>{slice.percent.toFixed(1)}%</span>
                          <span
                            className="text-[10px] md:text-xs font-semibold tabular-nums px-1 md:px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: slice.color + '22', color: slice.color }}
                          >{slice.count}</span>
                        </div>
                      </td>
                      {/* Cost — hidden on mobile */}
                      <td className="hidden sm:table-cell py-1.5 px-2 md:px-4 text-center tabular-nums text-xs md:text-sm font-semibold text-primary whitespace-nowrap">
                        {formatCurrencyK(slice.totalCost)}
                      </td>
                      {/* Value */}
                      <td className="py-1.5 px-2 md:px-4 text-center tabular-nums text-xs md:text-sm font-semibold text-primary whitespace-nowrap">
                        {formatCurrencyK(slice.value)}
                      </td>
                      {/* Daily change */}
                      <td className="py-1.5 px-2 md:px-4 text-center whitespace-nowrap" style={{ color: dailyColor }}>
                        <div className="tabular-nums text-xs md:text-sm font-semibold">{fmtMoneyFull(slice.dailyChange)}</div>
                        <div className="tabular-nums text-[10px] md:text-xs opacity-75">{fmtPct(slice.dailyChangePct)}</div>
                      </td>
                      {/* Total gain/loss */}
                      <td className="py-1.5 pl-2 md:pl-4 text-center whitespace-nowrap" style={{ color: gainColor }}>
                        <div className="tabular-nums text-xs md:text-sm font-semibold">{fmtMoney(slice.totalGain)}</div>
                        <div className="tabular-nums text-[10px] md:text-xs opacity-75">{fmtPct(slice.totalGainPct)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* ── Trend chart (Portfolio Trend / Total G/L / Total Return %) ── */}
      <TrendChart industryColors={industryColors} enabled={selectedIndustries} />

      {/* ── Individual stock price trend ── */}
      <StockPriceChart holdings={holdings} isPrivate={isPrivate} />
    </div>
  );
}
