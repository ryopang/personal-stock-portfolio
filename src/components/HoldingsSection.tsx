'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { HoldingTableRow, HoldingCard, GroupCard, GroupSummaryTableRow } from './HoldingRow';
import { TableSkeleton } from './LoadingSkeleton';
import PriceChange from './PriceChange';
import { formatCurrencyK } from '@/lib/formatters';
import type { HoldingWithMetrics } from '@/lib/types';
import type { AssetType } from '@/lib/types';

type Tab = 'all' | AssetType;
type SortKey = 'industry' | 'symbol' | 'quantity' | 'costBasis' | 'totalCost' | 'currentPrice' | 'currentValue' | 'dailyChangePercent' | 'totalGainPercent' | 'fiftyTwoWeekPosition';
type SortDir = 'asc' | 'desc';

const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stock', label: 'Stocks' },
  { value: 'etf', label: 'ETFs' },
  { value: 'crypto', label: 'Crypto' },
];

const TABLE_HEADERS: { label: string; key: SortKey; className: string }[] = [
  { label: 'Investment', key: 'symbol', className: 'pl-3 pr-2 text-left' },
  { label: 'Price', key: 'currentPrice', className: 'px-1.5 text-center' },
  { label: 'Quantity', key: 'quantity', className: 'px-1.5 text-center' },
  { label: 'Avg Cost', key: 'costBasis', className: 'px-1.5 text-center' },
  { label: 'Total Cost', key: 'totalCost', className: 'px-1.5 text-center whitespace-nowrap' },
  { label: 'Current Value', key: 'currentValue', className: 'px-1.5 text-center whitespace-nowrap' },
  { label: 'Daily Change', key: 'dailyChangePercent', className: 'px-1.5 text-center whitespace-nowrap' },
  { label: 'Total Gain / Loss', key: 'totalGainPercent', className: 'pl-1.5 pr-3 text-center whitespace-nowrap' },
  { label: '52W Range', key: 'fiftyTwoWeekPosition', className: 'px-2 pr-3 text-center whitespace-nowrap' },
];

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 opacity-30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
      </svg>
    );
  }
  return dir === 'asc' ? (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

interface Props {
  holdings: HoldingWithMetrics[];
  isLoading: boolean;
  onEdit: (holding: HoldingWithMetrics) => void;
  onDelete: (id: string) => void;
  moverFilter?: 'gainers' | 'losers' | null;
}

function computeAggregate(lots: HoldingWithMetrics[]): HoldingWithMetrics {
  const first = lots[0];
  const totalCost = lots.reduce((s, h) => s + h.totalCost, 0);
  const totalQuantity = lots.reduce((s, h) => s + h.quantity, 0);
  const currentValue = lots.reduce((s, h) => s + h.currentValue, 0);
  const totalGain = lots.reduce((s, h) => s + h.totalGain, 0);
  const dailyChange = lots.reduce((s, h) => s + h.dailyChange, 0);
  return {
    ...first,
    id: `group-${first.symbol}`,
    quantity: totalQuantity,
    costBasis: totalCost / totalQuantity,
    totalCost,
    currentValue,
    totalGain,
    totalGainPercent: totalCost > 0 ? (totalGain / totalCost) * 100 : 0,
    dailyChange,
  };
}

export default function HoldingsSection({ holdings, isLoading, onEdit, onDelete, moverFilter }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [activeIndustry, setActiveIndustry] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [alertFilter, setAlertFilter] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const filterBarRef = useRef<HTMLDivElement>(null);

  function toggleGroup(symbol: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // Tab-filtered only — used for industry counts and tab visibility
  const filtered = activeTab === 'all'
    ? holdings
    : holdings.filter((h) => h.type === activeTab);

  // Tab + industry + mover filtered — used for the actual table/cards
  const moverFiltered = moverFilter === 'gainers'
    ? filtered.filter((h) => h.dailyChange > 0)
    : moverFilter === 'losers'
    ? filtered.filter((h) => h.dailyChange < 0)
    : filtered;

  const industryFiltered = activeIndustry
    ? moverFiltered.filter((h) => (h.industry?.trim() || '—') === activeIndustry)
    : moverFiltered;

  const displayHoldings = alertFilter
    ? industryFiltered.filter((h) => Math.abs(h.dailyChangePercent) > 5)
    : industryFiltered;

  // Group by symbol, then sort groups by aggregate value
  const sortedGroups = useMemo(() => {
    const map = new Map<string, HoldingWithMetrics[]>();
    for (const h of displayHoldings) {
      if (!map.has(h.symbol)) map.set(h.symbol, []);
      map.get(h.symbol)!.push(h);
    }
    const groups = Array.from(map.values()).map((lots) => ({
      lots,
      aggregate: computeAggregate(lots),
    }));
    const mult = sortDir === 'asc' ? 1 : -1;
    groups.sort((ga, gb) => {
      const a = ga.aggregate;
      const b = gb.aggregate;
      if (sortKey === 'industry') {
        const ai = a.industry ?? '';
        const bi = b.industry ?? '';
        if (!ai && !bi) return 0;
        if (!ai) return 1;
        if (!bi) return -1;
        return mult * ai.localeCompare(bi);
      }
      if (sortKey === 'symbol') return mult * a.symbol.localeCompare(b.symbol);
      if (sortKey === 'fiftyTwoWeekPosition') {
        const pos = (h: HoldingWithMetrics) => {
          if (h.fiftyTwoWeekLow == null || h.fiftyTwoWeekHigh == null) return null;
          const range = h.fiftyTwoWeekHigh - h.fiftyTwoWeekLow;
          return range > 0 ? (h.currentPrice - h.fiftyTwoWeekLow) / range : 0.5;
        };
        const aPos = pos(a), bPos = pos(b);
        if (aPos === null && bPos === null) return 0;
        if (aPos === null) return 1;
        if (bPos === null) return -1;
        return mult * (aPos - bPos);
      }
      return mult * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return groups;
  }, [displayHoldings, sortKey, sortDir]);

  // Flat list for totals footer
  const sortedFiltered = useMemo(() => sortedGroups.flatMap((g) => g.lots), [sortedGroups]);

  const filteredTotals = useMemo(() => {
    const totalValue = sortedFiltered.reduce((s, h) => s + h.currentValue, 0);
    const totalDailyChange = sortedFiltered.reduce((s, h) => s + h.dailyChange, 0);
    const totalGain = sortedFiltered.reduce((s, h) => s + h.totalGain, 0);
    const totalCost = sortedFiltered.reduce((s, h) => s + h.totalCost, 0);
    const valueAtOpen = totalValue - totalDailyChange;
    const dailyChangePct = valueAtOpen > 0 ? (totalDailyChange / valueAtOpen) * 100 : 0;
    const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    return { totalValue, totalDailyChange, dailyChangePct, totalGain, gainPct, totalCost };
  }, [sortedFiltered]);

  const typeCounts = useMemo(() => {
    const seen = new Set<string>();
    const counts: Record<string, number> = { all: 0 };
    for (const h of holdings) {
      if (seen.has(h.symbol)) continue;
      seen.add(h.symbol);
      counts.all++;
      counts[h.type] = (counts[h.type] ?? 0) + 1;
    }
    return counts;
  }, [holdings]);

  // Only show tabs that have holdings
  const availableTabs = TABS.filter(
    (tab) => tab.value === 'all' || holdings.some((h) => h.type === tab.value)
  );

  // Industry counts for the current filtered view
  const industryCounts = useMemo(() => {
    const seen = new Set<string>();
    const counts: Record<string, number> = {};
    for (const h of filtered) {
      if (seen.has(h.symbol)) continue;
      seen.add(h.symbol);
      const key = h.industry?.trim() || '—';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [filtered]);

  const showFilterBar = availableTabs.length > 2 || (industryCounts.length > 0 && filtered.length > 0);

  // Keep --filter-bar-height in sync so the sticky thead can sit below the filter bar
  useEffect(() => {
    const el = filterBarRef.current;
    const setVar = (h: number) =>
      document.documentElement.style.setProperty('--filter-bar-height', `${h}px`);
    if (!el || !showFilterBar) { setVar(0); return; }
    setVar(el.offsetHeight);
    const ro = new ResizeObserver(() => setVar(el.offsetHeight));
    ro.observe(el);
    return () => { ro.disconnect(); setVar(0); };
  }, [showFilterBar]);

  if (isLoading && holdings.length === 0) {
    return <TableSkeleton rows={5} />;
  }

  return (
    <div>
      {/* Tab bar + industry chips on the same row */}
      {showFilterBar && (
        <div
          ref={filterBarRef}
          className="flex flex-col md:flex-row md:items-center gap-1 pb-3 mb-1 sticky z-30"
          style={{ top: 'var(--sticky-top, 0px)', backgroundColor: 'var(--color-background)' }}
        >
          {/* Type tabs — scrollable on mobile */}
          {availableTabs.length > 2 && (
            <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {availableTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setActiveTab(tab.value); setActiveIndustry(null); }}
                  className={`inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeTab === tab.value
                      ? 'bg-primary text-surface'
                      : 'text-secondary hover:text-primary hover:bg-surface-secondary'
                  }`}
                  style={{ touchAction: 'manipulation' }}
                >
                  {tab.label}
                  {tab.value !== 'all' && typeCounts[tab.value] != null && (
                    <span
                      className="ml-1.5 text-[10px] tabular-nums font-semibold px-1 py-px rounded-full leading-none"
                      style={{
                        backgroundColor: activeTab === tab.value ? 'rgba(255,255,255,0.2)' : 'var(--color-surface-secondary)',
                        color: activeTab === tab.value ? 'inherit' : 'var(--color-secondary)',
                      }}
                    >
                      {typeCounts[tab.value]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Industry chips — scrollable on mobile, right-aligned on desktop */}
          {industryCounts.length > 0 && filtered.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto md:ml-auto" style={{ scrollbarWidth: 'none' }}>
              {industryCounts.map(([industry, count]) => {
                const isActive = activeIndustry === industry;
                return (
                  <button
                    key={industry}
                    onClick={() => setActiveIndustry(isActive ? null : industry)}
                    className={`inline-flex items-center shrink-0 gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!isActive ? 'chip-industry' : ''}`}
                    style={{
                      backgroundColor: isActive ? 'var(--color-accent)' : undefined,
                      touchAction: 'manipulation',
                    }}
                  >
                    <span style={{ color: isActive ? '#fff' : 'var(--color-secondary)' }}>
                      {industry}
                    </span>
                    <span
                      className="tabular-nums min-w-[16px] text-center px-1 py-px rounded-full leading-none text-[10px] font-semibold"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-primary)',
                        color: isActive ? '#fff' : 'var(--color-surface)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <>
          {/* Desktop table */}
          <div className="hidden md:block card" style={{ overflow: 'hidden' }}>
            <div
              className="overflow-auto"
              style={{ maxHeight: 'calc(100dvh - var(--sticky-top, 0px) - var(--filter-bar-height, 0px) - 2rem)' }}
            >
            <table style={{ width: '100%', maxWidth: '100%' }}>
              <thead className="sticky z-20" style={{ top: 0 }}>
                <tr className="border-b border-border" style={{ backgroundColor: 'var(--color-surface)' }}>
                  {TABLE_HEADERS.map((h) => (
                    <th
                      key={h.label}
                      className={`py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide ${h.className}`}
                    >
                      {h.key === 'symbol' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setAlertFilter((f) => !f)}
                            title="Show only movers >5%"
                            className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] leading-none transition-colors shrink-0 ${
                              alertFilter
                                ? 'bg-primary text-surface'
                                : 'text-secondary hover:text-primary hover:bg-surface-secondary'
                            }`}
                          >
                            👀
                          </button>
                          <button
                            onClick={() => toggleSort(h.key)}
                            className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            {h.label}
                            <SortIcon active={sortKey === h.key} dir={sortDir} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleSort(h.key)}
                          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          {h.label}
                          <SortIcon active={sortKey === h.key} dir={sortDir} />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayHoldings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-secondary text-sm">
                      {activeIndustry
                        ? `No ${activeIndustry === '—' ? 'uncategorized' : activeIndustry} holdings.`
                        : `No ${activeTab === 'all' ? '' : activeTab} holdings yet.`}
                    </td>
                  </tr>
                ) : sortedGroups.map(({ lots, aggregate }) =>
                  lots.length === 1 ? (
                    <HoldingTableRow
                      key={lots[0].id}
                      holding={lots[0]}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ) : (
                    <>
                      <GroupSummaryTableRow
                        key={`group-${aggregate.symbol}`}
                        lotCount={lots.length}
                        aggregate={aggregate}
                        expanded={expandedGroups.has(aggregate.symbol)}
                        onToggle={() => toggleGroup(aggregate.symbol)}
                      />
                      {expandedGroups.has(aggregate.symbol) && lots.map((lot) => (
                        <HoldingTableRow
                          key={lot.id}
                          holding={lot}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          isChild
                        />
                      ))}
                    </>
                  )
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                  {/* Investment */}
                  <td className="py-2 pl-3 pr-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 shrink-0" />
                      <span className="text-xs font-semibold text-secondary uppercase tracking-wide">Total</span>
                    </div>
                  </td>
                  {/* Price */}
                  <td className="py-2px-2" />
                  {/* Quantity */}
                  <td className="py-2px-2" />
                  {/* Avg Cost */}
                  <td className="py-2px-2" />
                  {/* Total Cost */}
                  <td className="py-2 px-2 text-sm font-bold text-primary tabular-nums text-center">
                    {formatCurrencyK(filteredTotals.totalCost)}
                  </td>
                  {/* Current Value */}
                  <td className="py-2px-2 text-sm font-bold text-primary tabular-nums text-center">
                    {formatCurrencyK(filteredTotals.totalValue)}
                  </td>
                  {/* Daily Change */}
                  <td className="py-2px-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <PriceChange value={filteredTotals.totalDailyChange} format="currency" size="sm" noDecimals />
                      <PriceChange value={filteredTotals.totalDailyChange} percent={filteredTotals.dailyChangePct} format="percent" size="sm" className="opacity-70" />
                    </div>
                  </td>
                  {/* Total Gain/Loss */}
                  <td className="py-1.5 pl-1.5 pr-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <PriceChange value={filteredTotals.totalGain} format="currency" size="sm" noDecimals />
                      <PriceChange value={filteredTotals.totalGain} percent={filteredTotals.gainPct} format="percent" size="sm" className="opacity-70" />
                    </div>
                  </td>
                  {/* 52W Range — no aggregate total */}
                  <td className="py-1.5 px-3 pr-6" />
                </tr>
              </tfoot>
            </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {displayHoldings.length === 0 ? (
              <div className="card py-12 text-center text-secondary text-sm">
                {activeIndustry
                  ? `No ${activeIndustry === '—' ? 'uncategorized' : activeIndustry} holdings.`
                  : `No ${activeTab === 'all' ? '' : activeTab} holdings yet.`}
              </div>
            ) : sortedGroups.map(({ lots, aggregate }) =>
              lots.length === 1 ? (
                <HoldingCard
                  key={lots[0].id}
                  holding={lots[0]}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ) : (
                <div key={`group-${aggregate.symbol}`} className="space-y-1.5">
                  <GroupCard
                    lotCount={lots.length}
                    aggregate={aggregate}
                    expanded={expandedGroups.has(aggregate.symbol)}
                    onToggle={() => toggleGroup(aggregate.symbol)}
                  />
                  {expandedGroups.has(aggregate.symbol) && lots.map((lot) => (
                    <HoldingCard
                      key={lot.id}
                      holding={lot}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              )
            )}
          </div>
      </>
    </div>
  );
}
