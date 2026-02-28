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
    let gainers = 0, losers = 0;
    for (const h of holdings) {
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
      <div className="flex items-start justify-between mb-1 gap-4">
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-widest mb-1">
            Portfolio Value
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && (
            <span className="text-xs text-tertiary">
              Updated {formatTime(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-accent hover:bg-accent/10 active:bg-accent/20 transition-colors disabled:opacity-50"
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
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Total portfolio value */}
      <p
        className="text-3xl md:text-4xl font-bold tabular-nums tracking-tight mb-3 flex items-center gap-2 privacy-hide"
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
          <svg className="w-6 h-6 md:w-8 md:h-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
        )}
        {totals.dailyChange < 0 && (
          <svg className="w-6 h-6 md:w-8 md:h-8 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        )}
      </p>

      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-secondary mb-1">Today</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <PriceChange
              value={totals.dailyChange}
              percent={totals.dailyChangePercent}
              format="both"
              noDecimals
            />
            {holdings.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMoverFilter(moverFilter === 'gainers' ? null : 'gainers')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums transition-all"
                  style={{
                    backgroundColor: moverFilter === 'gainers' ? '#34C759' : 'rgba(52,199,89,0.12)',
                    color: moverFilter === 'gainers' ? '#fff' : '#34C759',
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  {dayMovers.gainers}
                </button>
                <button
                  onClick={() => onMoverFilter(moverFilter === 'losers' ? null : 'losers')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums transition-all"
                  style={{
                    backgroundColor: moverFilter === 'losers' ? '#FF3B30' : 'rgba(255,59,48,0.12)',
                    color: moverFilter === 'losers' ? '#fff' : '#FF3B30',
                  }}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {dayMovers.losers}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-secondary mb-1">Total invested</p>
          <span className="text-sm font-semibold text-primary tabular-nums">
            {formatCurrencyWhole(totals.totalCost)}
          </span>
        </div>
        <div className="col-span-2 md:col-span-1 text-center">
          <p className="text-xs text-secondary mb-1">Total gain / loss</p>
          <PriceChange
            value={totals.totalGain}
            percent={totals.totalGainPercent}
            format="both"
            noDecimals
          />
        </div>
      </div>
    </div>
  );
}
