'use client';

import { useMemo } from 'react';
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
}: Props) {
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

  return (
    <div className="card p-4 md:p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-secondary uppercase tracking-widest">
          Portfolio Value
        </p>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="hidden sm:block text-xs text-tertiary">
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Total portfolio value */}
      <div className="mb-3">
        <p
          className="text-2xl md:text-4xl font-bold tabular-nums tracking-tight flex items-center gap-2 privacy-hide"
          style={{
            color: totals.dailyChange > 0
              ? '#34C759'
              : totals.dailyChange < 0
              ? '#FF3B30'
              : '#1D1D1F',
          }}
        >
          {formatCurrencyWhole(totals.totalValue)}
          {totals.dailyChange > 0 && (
            <svg className="w-5 h-5 md:w-8 md:h-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          )}
          {totals.dailyChange < 0 && (
            <svg className="w-5 h-5 md:w-8 md:h-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          )}
        </p>
        {lastUpdated && (
          <p className="sm:hidden text-xs text-tertiary mt-0.5">
            Updated {formatTime(lastUpdated.toISOString())}
          </p>
        )}
      </div>

      {/* Metrics row — always 3 columns */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <div className="text-center min-w-0">
          {/* Label row: "Today" + mover badges side by side */}
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="text-xs text-secondary">Today</span>
            {holdings.length > 0 && (
              <span className="no-privacy flex items-center gap-1">
                <button
                  onClick={() => onMoverFilter(moverFilter === 'gainers' ? null : 'gainers')}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold tabular-nums transition-all"
                  style={{
                    backgroundColor: moverFilter === 'gainers' ? '#34C759' : 'rgba(52,199,89,0.12)',
                    color: moverFilter === 'gainers' ? '#fff' : '#34C759',
                    touchAction: 'manipulation',
                  }}
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  {dayMovers.gainers}
                </button>
                <button
                  onClick={() => onMoverFilter(moverFilter === 'losers' ? null : 'losers')}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold tabular-nums transition-all"
                  style={{
                    backgroundColor: moverFilter === 'losers' ? '#FF3B30' : 'rgba(255,59,48,0.12)',
                    color: moverFilter === 'losers' ? '#fff' : '#FF3B30',
                    touchAction: 'manipulation',
                  }}
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {dayMovers.losers}
                </button>
              </span>
            )}
          </div>
          {/* Mobile: stack value + percent to avoid overflow */}
          <div className="md:hidden flex flex-col items-center leading-tight">
            <PriceChange value={totals.dailyChange} percent={totals.dailyChangePercent} format="currency" noDecimals size="sm" />
            <PriceChange value={totals.dailyChange} percent={totals.dailyChangePercent} format="percent" size="sm" />
          </div>
          {/* Desktop: inline */}
          <div className="hidden md:block">
            <PriceChange value={totals.dailyChange} percent={totals.dailyChangePercent} format="both" noDecimals />
          </div>
        </div>
        <div className="text-center min-w-0">
          <p className="text-xs text-secondary mb-1">
            <span className="md:hidden">Invested</span>
            <span className="hidden md:inline">Total invested</span>
          </p>
          <span className="text-sm font-semibold text-primary tabular-nums privacy-hide">
            {formatCurrencyWhole(totals.totalCost)}
          </span>
        </div>
        <div className="text-center min-w-0">
          <p className="text-xs text-secondary mb-1">
            <span className="md:hidden">Total P&amp;L</span>
            <span className="hidden md:inline">Total gain / loss</span>
          </p>
          {/* Mobile: stack value + percent to avoid overflow */}
          <div className="md:hidden flex flex-col items-center leading-tight">
            <PriceChange value={totals.totalGain} percent={totals.totalGainPercent} format="currency" noDecimals size="sm" />
            <PriceChange value={totals.totalGain} percent={totals.totalGainPercent} format="percent" size="sm" />
          </div>
          {/* Desktop: inline */}
          <div className="hidden md:block">
            <PriceChange value={totals.totalGain} percent={totals.totalGainPercent} format="both" noDecimals />
          </div>
        </div>
      </div>

    </div>
  );
}
