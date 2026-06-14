'use client';

import { useMemo, useState } from 'react';
import PriceChange from './PriceChange';
import { SummarySkeleton } from './LoadingSkeleton';
import { formatCurrencyWhole, formatTime } from '@/lib/formatters';
import type { HoldingWithMetrics, PortfolioTotals } from '@/lib/types';

interface Props {
  holdings: HoldingWithMetrics[];
  totals: PortfolioTotals;
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | undefined;
  onRefresh: () => Promise<void>;
  moverFilter: 'gainers' | 'losers' | null;
  onMoverFilter: (f: 'gainers' | 'losers' | null) => void;
  alertFilter: boolean;
  onAlertFilter: (f: boolean) => void;
}

export default function PortfolioSummary({
  holdings,
  totals,
  isLoading,
  isRefreshing,
  lastUpdated,
  onRefresh,
  moverFilter,
  onMoverFilter,
  alertFilter,
  onAlertFilter,
}: Props) {
  const [hidden, setHidden] = useState(true);

  const dayMovers = useMemo(() => {
    const seen = new Set<string>();
    let gainers = 0, losers = 0;
    for (const h of holdings) {
      if (seen.has(h.symbol)) continue;
      seen.add(h.symbol);
      if (h.dailyChange > 0) gainers++;
      else if (h.dailyChange < 0) losers++;
    }
    return { gainers, losers };
  }, [holdings]);

  if (isLoading && holdings.length === 0) {
    return <SummarySkeleton />;
  }

  const valueColor = hidden
    ? 'text-secondary'
    : totals.dailyChange > 0
    ? 'text-gain'
    : totals.dailyChange < 0
    ? 'text-loss'
    : 'text-primary';

  const dayAccentShadow = holdings.length > 0
    ? totals.dailyChange > 0
      ? 'inset 3px 0 0 #34C759'
      : totals.dailyChange < 0
      ? 'inset 3px 0 0 #FF3B30'
      : undefined
    : undefined;

  return (
    <div className="card p-4 md:p-5" style={dayAccentShadow ? { boxShadow: dayAccentShadow } : undefined}>
      {/* Row 1: label + controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-secondary uppercase tracking-widest">
            Portfolio Value
          </span>
          <button
            onClick={() => setHidden(h => !h)}
            className="flex items-center justify-center rounded-lg text-secondary hover:bg-accent/10 active:bg-accent/20 transition-colors"
            style={{ padding: '0.25rem', touchAction: 'manipulation' }}
            aria-label={hidden ? 'Show values' : 'Hide values'}
            title={hidden ? 'Show values' : 'Hide values'}
          >
            {hidden ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-tertiary">
              Updated {formatTime(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 active:bg-accent/20 transition-colors disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
            aria-label="Refresh prices"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: portfolio value + daily change on the same baseline */}
      <div className="flex items-baseline gap-3 flex-wrap mb-4 privacy-hide">
        <p className={`text-3xl md:text-4xl font-bold tabular-nums tracking-tight ${valueColor}`}>
          {hidden ? '••••••' : formatCurrencyWhole(totals.totalValue)}
        </p>
        <PriceChange
          value={totals.dailyChange}
          percent={totals.dailyChangePercent}
          format={hidden ? 'currency' : 'both'}
          noDecimals
          size="md"
        />
      </div>

      {/* Row 3: secondary metrics bar */}
      <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap pt-3 border-t border-border">
        {/* Invested */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-secondary">Invested</span>
          <span className="text-sm font-semibold text-primary tabular-nums privacy-hide">
            {hidden ? '••••' : formatCurrencyWhole(totals.totalCost)}
          </span>
        </div>

        <div className="w-px h-3 bg-border shrink-0" />

        {/* Total P&L */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-secondary">Total P&amp;L</span>
          {hidden ? (
            <span className="text-sm font-semibold text-secondary tabular-nums">••••</span>
          ) : (
            <PriceChange value={totals.totalGain} percent={totals.totalGainPercent} format="both" noDecimals />
          )}
        </div>

        {/* Mover filters — right-aligned */}
        {holdings.length > 0 && (
          <div className="ml-auto no-privacy flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onAlertFilter(!alertFilter)}
              aria-pressed={alertFilter}
              aria-label="Show only movers over 5%"
              className={`inline-flex items-center shrink-0 whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                alertFilter ? 'bg-primary text-surface' : 'text-secondary hover:text-primary hover:bg-surface-secondary'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              👀 Movers
            </button>
            <button
              onClick={() => onMoverFilter(moverFilter === 'gainers' ? null : 'gainers')}
              aria-pressed={moverFilter === 'gainers'}
              aria-label="Filter to gainers"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums transition-all"
              style={{
                backgroundColor: moverFilter === 'gainers' ? '#34C759' : 'rgba(52,199,89,0.12)',
                color: moverFilter === 'gainers' ? '#fff' : '#34C759',
                touchAction: 'manipulation',
              }}
            >
              <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              {dayMovers.gainers}
            </button>
            <button
              onClick={() => onMoverFilter(moverFilter === 'losers' ? null : 'losers')}
              aria-pressed={moverFilter === 'losers'}
              aria-label="Filter to losers"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums transition-all"
              style={{
                backgroundColor: moverFilter === 'losers' ? '#FF3B30' : 'rgba(255,59,48,0.12)',
                color: moverFilter === 'losers' ? '#fff' : '#FF3B30',
                touchAction: 'manipulation',
              }}
            >
              <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              {dayMovers.losers}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
