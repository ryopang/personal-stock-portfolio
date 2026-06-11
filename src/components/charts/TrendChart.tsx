'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import type { DailySnapshot } from '@/lib/types';
import type { HistoryResponse } from '@/app/api/history/route';
import { fmtMoney, fmtMoneyFull, calendarMidpointIdxs } from './shared';

const snapshotFetcher = (url: string) => fetch(url).then(r => r.json());

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
  return snaps.filter(s => s.date.startsWith(range));
}

const BENCHMARK_OPTIONS = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^NDX',  label: 'Nasdaq 100' },
  { symbol: '^DJI',  label: 'Dow Jones' },
] as const;
type BenchmarkSymbol = typeof BENCHMARK_OPTIONS[number]['symbol'];

interface TrendChartProps { industryColors: Map<string, string>; enabled: Set<string>; }

export function TrendChart({ industryColors, enabled }: TrendChartProps) {
  const [mode, setMode] = useState<ChartMode>('value');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<string>('ytd');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [benchmarkSymbol, setBenchmarkSymbol] = useState<BenchmarkSymbol>('^GSPC');

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

  const benchmarkPeriod1 = filtered.length > 0 ? filtered[0].date : null;
  const { data: benchmarkRaw } = useSWR<HistoryResponse>(
    showBenchmark && benchmarkPeriod1
      ? `/api/history?symbol=${encodeURIComponent(benchmarkSymbol)}&period1=${benchmarkPeriod1}`
      : null,
    snapshotFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0 },
  );

  const benchmarkVals = useMemo((): (number | null)[] | null => {
    if (!showBenchmark || !benchmarkRaw?.points?.length) return null;
    const sorted = [...benchmarkRaw.points].sort((a, b) => a.date.localeCompare(b.date));
    return filtered.map(s => {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].date.slice(0, 10) <= s.date) return sorted[i].close;
      }
      return null;
    });
  }, [showBenchmark, benchmarkRaw, filtered]);

  const portfolioNormVals = useMemo((): (number | null)[] | null => {
    if (!showBenchmark || filtered.length === 0) return null;
    const base = filtered[0].totalValue;
    if (!base) return null;
    return filtered.map(s => ((s.totalValue - base) / base) * 100);
  }, [showBenchmark, filtered]);

  const benchmarkNormVals = useMemo((): (number | null)[] | null => {
    if (!benchmarkVals) return null;
    const base = benchmarkVals.find((v): v is number => v !== null);
    if (!base) return null;
    return benchmarkVals.map(v => v !== null ? ((v - base) / base) * 100 : null);
  }, [benchmarkVals]);

  const showIndustryOverlays = mode !== 'return';
  const hasSelectedIndustry = enabled.size > 0;

  // Auto-disable benchmark when an industry is selected (incompatible views)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasSelectedIndustry) setShowBenchmark(false);
  }, [hasSelectedIndustry]);

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

  const returnVals = filtered.map(s => s.totalCost > 0 ? (s.totalGain / s.totalCost) * 100 : null);
  const mainVals: (number | null)[] = showBenchmark && portfolioNormVals
    ? portfolioNormVals
    : mode === 'value'
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

  const W = 800, H = 300;
  const ml = 84, mr = 20, mt = 16, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = filtered.length;

  function xOf(i: number) { return ml + (i / (n - 1)) * cW; }

  const industryVals = showIndustryOverlays
    ? filtered.flatMap(s => [...enabled].map(ind => s.byIndustry[ind]?.totalGain ?? 0))
    : [];
  const benchmarkDefinedVals = benchmarkNormVals?.filter((v): v is number => v !== null) ?? [];
  const allVals = hasSelectedIndustry && industryVals.length > 0
    ? industryVals
    : [...definedMain, ...industryVals, ...benchmarkDefinedVals];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.05 || 1;
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
    if (showBenchmark) return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
    if (mode === 'return') return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    const abs = Math.abs(v);
    if (mode === 'gain' || hasSelectedIndustry) {
      const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}m`
        : abs >= 1_000 ? `$${(abs / 1_000).toFixed(0)}k`
        : `$${abs.toFixed(0)}`;
      return `${v < 0 ? '-' : '+'}${s}`;
    }
    const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000 ? `$${(abs / 1_000).toFixed(1)}k`
      : `$${abs.toFixed(0)}`;
    return v < 0 ? `-${s}` : s;
  }

  function fmtFull(v: number) {
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const lastMain = definedMain[definedMain.length - 1] ?? 0;
  const lineColor = showBenchmark
    ? 'var(--color-accent)'
    : mode === 'value'
    ? 'var(--color-accent)'
    : mode === 'return'
    ? '#AF52DE'
    : lastMain >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';

  const benchmarkLabel = BENCHMARK_OPTIONS.find(b => b.symbol === benchmarkSymbol)?.label ?? benchmarkSymbol;
  const lastBenchmarkNorm = benchmarkNormVals?.filter((v): v is number => v !== null).at(-1) ?? null;
  const alpha = showBenchmark && lastMain !== null && lastBenchmarkNorm !== null
    ? lastMain - lastBenchmarkNorm : null;

  const mainPath = makePath(mainVals);
  const benchmarkPath = benchmarkNormVals ? makePath(benchmarkNormVals) : '';

  const industryGainSeries = hasSelectedIndustry && filtered.length > 0
    ? filtered.map(s => [...enabled].reduce((sum, ind) => sum + (s.byIndustry[ind]?.totalGain ?? 0), 0))
    : null;

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
    const s = abs >= 1_000_000
      ? `$${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
      ? `$${(abs / 1_000).toFixed(1)}K`
      : `$${abs.toFixed(0)}`;
    return `${v < 0 ? '-' : ''}${s}`;
  }

  function fmtPeriodChange(delta: number, pct: number) {
    if (mode === 'return') {
      return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} pp`;
    }
    const abs = Math.abs(delta);
    const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `$${(abs / 1_000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
    return `${delta >= 0 ? '+' : '-'}${s} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`;
  }

  return (
    <div className="card p-6">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={mode}
            onChange={e => setMode(e.target.value as ChartMode)}
            disabled={showBenchmark}
            className="text-xs font-medium rounded-lg px-2.5 py-1 outline-none shrink-0"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              color: showBenchmark ? 'var(--color-secondary)' : 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              cursor: showBenchmark ? 'default' : 'pointer',
              opacity: showBenchmark ? 0.45 : 1,
            }}
          >
            {CHART_MODES.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => !hasSelectedIndustry && setShowBenchmark(b => !b)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shrink-0"
            style={{
              backgroundColor: showBenchmark ? '#FF9500' : 'var(--color-surface-secondary)',
              color: showBenchmark ? '#fff' : 'var(--color-secondary)',
              border: '1px solid var(--color-border)',
              opacity: hasSelectedIndustry ? 0.45 : 1,
              cursor: hasSelectedIndustry ? 'default' : 'pointer',
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3" />
            </svg>
            vs Benchmark
          </button>
          {showBenchmark && (
            <select
              value={benchmarkSymbol}
              onChange={e => setBenchmarkSymbol(e.target.value as BenchmarkSymbol)}
              className="text-xs font-medium rounded-lg px-2 py-1 outline-none"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
                cursor: 'pointer',
              }}
            >
              {BENCHMARK_OPTIONS.map(({ symbol, label }) => (
                <option key={symbol} value={symbol}>{label}</option>
              ))}
            </select>
          )}
        </div>
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
        style={{
          filter: isPrivate ? 'blur(8px)' : 'none',
          transition: 'filter 0.2s',
          userSelect: isPrivate ? 'none' : undefined,
        }}
        className="mb-3"
      >
        {showBenchmark ? (
          <div className="flex items-start gap-0">
            <div className="flex flex-col items-center gap-1" style={{ minWidth: 130, paddingRight: 32, borderRight: '1px solid var(--color-border)' }}>
              <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-secondary)' }}>Portfolio</span>
              <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: lastMain >= 0 ? '#34C759' : '#FF3B30' }}>
                {lastMain >= 0 ? '+' : ''}{lastMain.toFixed(2)}%
              </span>
            </div>
            {lastBenchmarkNorm !== null && (
              <div className="flex flex-col items-center gap-1" style={{ minWidth: 130, padding: '0 32px', borderRight: alpha !== null ? '1px solid var(--color-border)' : 'none' }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-secondary)' }}>{benchmarkLabel}</span>
                <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: '#FF9500' }}>
                  {lastBenchmarkNorm >= 0 ? '+' : ''}{lastBenchmarkNorm.toFixed(2)}%
                </span>
              </div>
            )}
            {alpha !== null && (
              <div className="flex flex-col items-center gap-1" style={{ minWidth: 130, paddingLeft: 32, paddingRight: 32 }}>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-secondary)' }}>Alpha</span>
                <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: alpha >= 0 ? '#34C759' : '#FF3B30' }}>
                  {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)} pp
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-baseline gap-3">
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
        )}
      </div>

      {/* SVG line chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <filter id="privacy-blur-trend" x="-20%" y="-20%" width="140%" height="140%">
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
            filter={isPrivate ? 'url(#privacy-blur-trend)' : undefined}
            style={{ fill: 'var(--color-secondary)' }}>
            {fmtY(v)}
          </text>
        ))}
        {(showBenchmark || mode !== 'value' || hasSelectedIndustry) && yMin < 0 && yMax > 0 && (
          <line x1={ml} y1={yOf(0)} x2={ml + cW} y2={yOf(0)}
            stroke="var(--color-secondary)" strokeWidth={1} opacity={0.3} />
        )}
        {xLabelIdxs.map(idx => (
          <text key={idx} x={xOf(idx)} y={mt + cH + 22} textAnchor="middle" fontSize={10}
            style={{ fill: 'var(--color-secondary)' }}>
            {fmtDate(filtered[idx].date)}
          </text>
        ))}
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
        {!hasSelectedIndustry && (
          <path d={mainPath} fill="none" stroke={lineColor}
            strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {showBenchmark && benchmarkPath && !hasSelectedIndustry && (
          <path d={benchmarkPath} fill="none" stroke="#FF9500"
            strokeWidth={2} strokeDasharray="6 3" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
        )}
        {hoverIdx !== null && (
          <line x1={xOf(hoverIdx)} y1={mt} x2={xOf(hoverIdx)} y2={mt + cH}
            stroke="var(--color-secondary)" strokeWidth={1} strokeDasharray="3 2" opacity={0.45} />
        )}
        <rect x={ml} y={mt} width={cW} height={cH} fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect();
            const frac = (e.clientX - r.left) / r.width;
            setHoverIdx(Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1)))));
          }}
          onMouseLeave={() => setHoverIdx(null)}
        />
        {hovSnap && hoverIdx !== null && hovMain !== null && (() => {
          const enabledArr = showIndustryOverlays ? [...enabled] : [];
          const hovBenchmark = benchmarkNormVals ? benchmarkNormVals[hoverIdx] : null;
          const tooltipLines: { label: string; value: string; color: string }[] = [
            ...(showBenchmark && !hasSelectedIndustry ? [
              {
                label: 'Portfolio',
                value: hovMain !== null ? `${hovMain >= 0 ? '+' : ''}${hovMain.toFixed(2)}%` : '—',
                color: 'var(--color-accent)',
              },
              {
                label: benchmarkLabel,
                value: hovBenchmark !== null ? `${hovBenchmark >= 0 ? '+' : ''}${hovBenchmark.toFixed(2)}%` : '—',
                color: '#FF9500',
              },
            ] : []),
            ...(!showBenchmark && !hasSelectedIndustry ? [{
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
