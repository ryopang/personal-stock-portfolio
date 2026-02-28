'use client';

import { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { formatCurrencyK } from '@/lib/formatters';
import type { HoldingWithMetrics, DailySnapshot } from '@/lib/types';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { HistoryPoint } from '@/app/api/history/route';

const COLORS = [
  '#0071E3', '#34C759', '#FF9500', '#AF52DE', '#FF3B30',
  '#5AC8FA', '#FFCC00', '#FF2D55', '#32ADE6', '#30D158',
];

interface Slice {
  industry: string;
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

type ChartMode = 'value' | 'gain' | 'return';

const CHART_MODES: { id: ChartMode; label: string }[] = [
  { id: 'value',  label: 'Portfolio Trend' },
  { id: 'gain',   label: 'Total G/L' },
  { id: 'return', label: 'Total Return %' },
];

const TIME_RANGE_LABELS: Record<string, string> = {
  all: 'All', 'this-week': 'Current Week', 'this-month': 'Current Month',
  'last-month': 'Last Month', ytd: 'YTD',
};

function filterByTimeRange(snaps: DailySnapshot[], range: string): DailySnapshot[] {
  if (range === 'all') return snaps;
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');

  if (range === 'this-week') {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const cutoff = `${mon.getFullYear()}-${p(mon.getMonth() + 1)}-${p(mon.getDate())}`;
    return snaps.filter(s => s.date >= cutoff);
  }
  if (range === 'this-month') {
    const cutoff = `${now.getFullYear()}-${p(now.getMonth() + 1)}-01`;
    return snaps.filter(s => s.date >= cutoff);
  }
  if (range === 'last-month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const start = `${d.getFullYear()}-${p(d.getMonth() + 1)}-01`;
    const end = `${now.getFullYear()}-${p(now.getMonth() + 1)}-01`;
    return snaps.filter(s => s.date >= start && s.date < end);
  }
  if (range === 'ytd') {
    return snaps.filter(s => s.date >= `${now.getFullYear()}-01-01`);
  }
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
  const allVals = [
    ...definedMain,
    ...(showIndustryOverlays
      ? filtered.flatMap(s => [...enabled].map(ind => s.byIndustry[ind]?.totalGain ?? 0))
      : []),
  ];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const pad = (rawMax - rawMin) * 0.08 || Math.abs(rawMax) * 0.05 || 1;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
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
    if (mode === 'gain') {
      const abs = Math.abs(v);
      const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(1)}m` : abs >= 1_000 ? `$${(abs / 1_000).toFixed(0)}k` : `$${abs.toFixed(0)}`;
      return `${v < 0 ? '-' : '+'}${s}`;
    }
    const abs = Math.abs(v);
    const s = `$${(abs / 1_000_000).toFixed(2)}M`;
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

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (i / yTickCount) * yRange);

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
    if (timeRange === 'all')
      return midpointsByKey(s => {
        const [yyyy, mm] = s.date.slice(0, 7).split('-');
        return `${yyyy}-Q${Math.ceil(Number(mm) / 3)}`;
      });
    if (/^\d{4}$/.test(timeRange))
      return midpointsByKey(s => s.date.slice(0, 7));
    if (timeRange === 'this-week')
      return midpointsByKey(s => s.date);
    if (timeRange === 'this-month' || timeRange === 'last-month' || timeRange === 'ytd')
      return midpointsByKey(s => {
        const w = Math.ceil(Number(s.date.slice(8, 10)) / 7);
        return `${s.date.slice(0, 7)}-W${w}`;
      });
    const labelCount = Math.min(n, 7);
    return Array.from({ length: labelCount }, (_, i) =>
      Math.round(i * (n - 1) / (labelCount - 1)),
    );
  })();
  function fmtDate(d: string) {
    const dt = new Date(d + 'T12:00:00');
    if (timeRange === 'this-week')
      return dt.toLocaleDateString('en-US', { weekday: 'short' });
    if (timeRange === 'this-month' || timeRange === 'last-month')
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (timeRange === 'ytd') {
      const mon = dt.toLocaleDateString('en-US', { month: 'short' });
      const wk = Math.ceil(dt.getDate() / 7);
      return `${mon} W${wk}`;
    }
    if (/^\d{4}$/.test(timeRange))
      return dt.toLocaleDateString('en-US', { month: 'short' });
    // 'all': YY-Q1/Q2/Q3/Q4
    const mm = dt.getMonth(); // 0-based
    const q = mm < 3 ? 'Q1' : mm < 6 ? 'Q2' : mm < 9 ? 'Q3' : 'Q4';
    const yy = String(dt.getFullYear()).slice(2);
    return `${yy}-${q}`;
  }

  const hovSnap = hoverIdx !== null ? filtered[hoverIdx] : null;
  const hovMain = hoverIdx !== null ? mainVals[hoverIdx] : null;

  return (
    <div className="card p-6">
      {/* Row 1: mode toggles (left) + time range (right) */}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex gap-1.5">
          {CHART_MODES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: mode === id ? 'var(--color-accent)' : 'var(--color-surface-secondary)',
                color: mode === id ? '#fff' : 'var(--color-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <select
          value={timeRange}
          onChange={e => { setTimeRange(e.target.value); setHoverIdx(null); }}
          className="text-xs font-medium rounded-lg px-2.5 py-1 outline-none"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          {(['all', 'this-week', 'this-month', 'last-month', 'ytd', ...years] as string[]).map(r => (
            <option key={r} value={r}>{TIME_RANGE_LABELS[r] ?? r}</option>
          ))}
        </select>
      </div>

      {/* SVG line chart */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line key={i}
            x1={ml} y1={yOf(v)} x2={ml + cW} y2={yOf(v)}
            stroke="var(--color-border)"
            strokeWidth={i === 0 ? 1 : 0.5}
            strokeDasharray={i === 0 ? undefined : '4 3'}
          />
        ))}

        {/* Y labels — wrapped in a single <g> so CSS filter works reliably */}
        <g style={{
          filter: isPrivate ? 'blur(8px)' : 'none',
          transition: 'filter 0.2s',
          userSelect: isPrivate ? 'none' : undefined,
        }}>
          {yTicks.map((v, i) => (
            <text key={i} x={ml - 8} y={yOf(v) + 4} textAnchor="end" fontSize={10}
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtY(v)}
            </text>
          ))}
        </g>

        {/* Zero line (gain/return modes, if crosses zero) */}
        {mode !== 'value' && yMin < 0 && yMax > 0 && (
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
              strokeWidth={1.5} strokeDasharray="5 3"
              strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          );
        })}

        {/* Main line */}
        <path d={mainPath} fill="none" stroke={lineColor}
          strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

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
            {
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
            },
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

function StockPriceChart({ holdings }: { holdings: HoldingWithMetrics[] }) {
  const uniqueHoldings = useMemo(
    () => [...new Map(holdings.map(h => [h.symbol, h])).values()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [holdings],
  );

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => uniqueHoldings[0]?.symbol ?? '');
  const [range, setRange] = useState<StockRange>('Today');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Keep selectedSymbol valid when holdings change
  useEffect(() => {
    if (uniqueHoldings.length && !uniqueHoldings.find(h => h.symbol === selectedSymbol)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSymbol(uniqueHoldings[0].symbol);
    }
  }, [uniqueHoldings, selectedSymbol]);

  const holding = uniqueHoldings.find(h => h.symbol === selectedSymbol) ?? uniqueHoldings[0];
  const yahooSym = holding ? toYahooSymbol(holding.symbol, holding.type) : '';

  const { data, isLoading } = useSWR<{ points: HistoryPoint[] }>(
    yahooSym ? `/api/history?symbol=${encodeURIComponent(yahooSym)}&range=${range}` : null,
    histFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0 },
  );

  const points = data?.points ?? [];

  if (!uniqueHoldings.length) return null;

  // ── SVG layout ──
  const W = 800, H = 300;
  const ml = 72, mr = 20, mt = 20, mb = 44;
  const cW = W - ml - mr, cH = H - mt - mb;
  const n = points.length;

  const firstClose = points[0]?.close ?? 0;
  const lastClose = points[n - 1]?.close ?? 0;
  const isUp = lastClose >= firstClose;
  const lineColor = isUp ? 'var(--color-gain)' : 'var(--color-loss)';
  const fillId = 'stockAreaGrad';

  function xOf(i: number) { return ml + (i / Math.max(n - 1, 1)) * cW; }

  const closes = points.map(p => p.close);
  const minClose = n ? Math.min(...closes) : 0;
  const maxClose = n ? Math.max(...closes) : 1;
  const pad = (maxClose - minClose) * 0.08 || maxClose * 0.05 || 1;
  const yMin = minClose - pad;
  const yMax = maxClose + pad;
  const yRange = yMax - yMin;

  function yOf(v: number) { return mt + cH - ((v - yMin) / yRange) * cH; }

  const linePath = n >= 2 ? points.reduce<string>((acc, p, i) => {
    return acc + (i === 0 ? `M${xOf(i)},${yOf(p.close)}` : ` L${xOf(i)},${yOf(p.close)}`);
  }, '') : '';

  const areaPath = linePath
    ? `${linePath} L${xOf(n - 1)},${mt + cH} L${xOf(0)},${mt + cH} Z`
    : '';

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => yMin + (i / yTickCount) * yRange);

  function fmtXDate(d: string) {
    // Intraday dates are full ISO timestamps; daily dates are YYYY-MM-DD
    const dt = d.includes('T') ? new Date(d) : new Date(d + 'T12:00:00');
    if (range === 'Today')                 return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (range === '1W')                    return dt.toLocaleDateString('en-US', { weekday: 'short' });
    if (range === '1M')                    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (range === '3M' || range === '6M')  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (range === 'YTD' || range === '1Y') return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    return String(dt.getFullYear());
  }

  const xLabelCount = Math.min(n, 6);
  const xLabelIdxs = n <= 1 ? [0] : Array.from({ length: xLabelCount }, (_, i) =>
    Math.round(i * (n - 1) / (xLabelCount - 1)),
  );

  function changeFromStart(close: number) {
    if (!firstClose) return { dollar: 0, pct: 0 };
    const dollar = close - firstClose;
    return { dollar, pct: (dollar / firstClose) * 100 };
  }

  const hovPoint = hoverIdx !== null ? points[hoverIdx] : null;

  return (
    <div className="card p-6 no-privacy">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <select
          value={selectedSymbol}
          onChange={e => { setSelectedSymbol(e.target.value); setHoverIdx(null); }}
          className="text-sm font-semibold rounded-lg px-3 py-1.5 outline-none"
          style={{
            backgroundColor: 'var(--color-surface-secondary)',
            color: 'var(--color-primary)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer',
          }}
        >
          {uniqueHoldings.map(h => (
            <option key={h.symbol} value={h.symbol}>{h.symbol} — {h.name}</option>
          ))}
        </select>

        <div className="flex gap-1">
          {STOCK_RANGES.map(r => (
            <button
              key={r}
              onClick={() => { setRange(r); setHoverIdx(null); }}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
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
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtPrice(v)}
            </text>
          ))}

          {/* X labels */}
          {xLabelIdxs.map(idx => (
            <text key={idx} x={xOf(idx)} y={mt + cH + 22} textAnchor="middle" fontSize={10}
              style={{ fill: 'var(--color-secondary)' }}>
              {fmtXDate(points[idx].date)}
            </text>
          ))}

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
              <circle cx={xOf(hoverIdx)} cy={yOf(points[hoverIdx].close)} r={4}
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
                    ? new Date(hovPoint.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
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

  function toggleIndustry(industry: string) {
    setSelectedIndustries(prev => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(industry) ? next.delete(industry) : next.add(industry);
      return next;
    });
  }

  const slices = useMemo((): Slice[] => {
    const map = new Map<string, { value: number; dailyChange: number; totalGain: number; totalCost: number }>();
    for (const h of holdings) {
      const key = h.industry?.trim() || 'Other';
      const p = map.get(key) ?? { value: 0, dailyChange: 0, totalGain: 0, totalCost: 0 };
      map.set(key, { value: p.value + h.currentValue, dailyChange: p.dailyChange + h.dailyChange, totalGain: p.totalGain + h.totalGain, totalCost: p.totalCost + h.totalCost });
    }
    const total = [...map.values()].reduce((s, v) => s + v.value, 0);
    const sorted = [...map.entries()].sort(([, a], [, b]) => b.value - a.value);
    let angle = 0;
    return sorted.map(([industry, d], i) => {
      const percent = (d.value / total) * 100;
      const sweep = (percent / 100) * 360;
      const s: Slice = {
        industry, percent, color: COLORS[i % COLORS.length],
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
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide mb-5">
          Industry Distribution
        </h2>

        <div className="flex gap-8 items-start">

          {/* ── Donut chart ── */}
          <div className="shrink-0">
            <svg width={324} height={324} viewBox="0 0 360 360">
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
                  <text x={cx} y={cy + 32} textAnchor="middle" fontSize={14} style={{ fill: 'var(--color-secondary)' }}>{formatCurrencyK(hoveredSlice.value)}</text>
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
          <div className="flex-1 min-w-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th className="text-left pb-2 pr-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Industry</th>
                  <th className="text-center pb-2 px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Cost</th>
                  <th className="text-center pb-2 px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Value</th>
                  <th className="text-center pb-2 px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Daily Change</th>
                  <th className="text-center pb-2 pl-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Total G/L</th>
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
                      <td className="py-1.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="font-medium text-primary">{slice.industry}</span>
                          <span className="text-xs font-semibold tabular-nums" style={{ color: slice.color }}>{slice.percent.toFixed(1)}%</span>
                        </div>
                      </td>
                      {/* Cost */}
                      <td className="py-1.5 px-4 text-center tabular-nums font-semibold text-primary whitespace-nowrap">
                        {formatCurrencyK(slice.totalCost)}
                      </td>
                      {/* Value */}
                      <td className="py-1.5 px-4 text-center tabular-nums font-semibold text-primary whitespace-nowrap">
                        {formatCurrencyK(slice.value)}
                      </td>
                      {/* Daily change */}
                      <td className="py-1.5 px-4 text-center whitespace-nowrap" style={{ color: dailyColor }}>
                        <div className="tabular-nums font-semibold">{fmtMoneyFull(slice.dailyChange)}</div>
                        <div className="tabular-nums text-xs opacity-75">{fmtPct(slice.dailyChangePct)}</div>
                      </td>
                      {/* Total gain/loss */}
                      <td className="py-1.5 pl-4 text-center whitespace-nowrap" style={{ color: gainColor }}>
                        <div className="tabular-nums font-semibold">{fmtMoney(slice.totalGain)}</div>
                        <div className="tabular-nums text-xs opacity-75">{fmtPct(slice.totalGainPct)}</div>
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
      <StockPriceChart holdings={holdings} />
    </div>
  );
}
