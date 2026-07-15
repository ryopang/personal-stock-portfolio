'use client';

import { useMemo, useEffect, useRef } from 'react';
import { usePortfolioStore } from '@/store/portfolioStore';
import { useQuotes } from './useQuotes';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import { computeHoldingMetrics, computePortfolioTotals } from '@/lib/calculations';
import type { HoldingWithMetrics, PortfolioTotals, Quote, DailySnapshot } from '@/lib/types';

interface UsePortfolioReturn {
  holdingsWithMetrics: HoldingWithMetrics[];
  totals: PortfolioTotals;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
  lastUpdated: Date | undefined;
  missingQuoteSymbols: string[];
}

// Read-only: holdings + live quotes -> metrics/totals, no side effects.
// Safe to call from multiple components at once — the underlying SWR
// fetch is deduped by symbol key, so this doesn't trigger extra requests.
export function usePortfolioData(): UsePortfolioReturn {
  const holdings = usePortfolioStore((s) => s.holdings);
  const { quotes, isLoading, isRefreshing, error, refresh, lastUpdated } = useQuotes(holdings);

  const quoteMap = useMemo(() => {
    const map = new Map<string, Quote>();
    if (quotes) {
      for (const q of quotes) {
        map.set(q.symbol, q);
      }
    }
    return map;
  }, [quotes]);

  const holdingsWithMetrics = useMemo(() => {
    return holdings
      .map((h) => {
        const yahooSymbol = toYahooSymbol(h.symbol, h.type);
        const quote = quoteMap.get(yahooSymbol);
        if (!quote) return null;
        return computeHoldingMetrics(h, quote);
      })
      .filter((h): h is HoldingWithMetrics => h !== null);
  }, [holdings, quoteMap]);  // Note: sorting is handled by HoldingsSection's own sort logic

  // Only report missing symbols after the first successful quote fetch.
  // Before that, all holdings appear "missing" because the map is empty.
  const missingQuoteSymbols = useMemo(() => {
    if (!lastUpdated) return [];
    return holdings
      .filter((h) => !quoteMap.get(toYahooSymbol(h.symbol, h.type)))
      .map((h) => h.symbol);
  }, [holdings, quoteMap, lastUpdated]);

  const totals = useMemo(
    () => computePortfolioTotals(holdingsWithMetrics),
    [holdingsWithMetrics]
  );

  return {
    holdingsWithMetrics,
    totals,
    isLoading,
    isRefreshing,
    error,
    refresh,
    lastUpdated,
    missingQuoteSymbols,
  };
}

// Adds the daily-snapshot write on top of usePortfolioData. Only Dashboard
// should use this — mounting it more than once would double-write snapshots.
export function usePortfolio(): UsePortfolioReturn {
  const data = usePortfolioData();
  const { holdingsWithMetrics, totals, lastUpdated } = data;

  // Refs hold the latest values without making them effect dependencies.
  // This ensures the effect only fires when lastUpdated changes (new quote fetch),
  // but always captures the current computed holdings/totals.
  const holdingsRef = useRef(holdingsWithMetrics);
  const totalsRef = useRef(totals);
  holdingsRef.current = holdingsWithMetrics;
  totalsRef.current = totals;

  useEffect(() => {
    if (!lastUpdated || holdingsRef.current.length === 0) return;

    const today = new Date().toLocaleDateString('en-CA');

    const byIndustry: DailySnapshot['byIndustry'] = {};
    for (const h of holdingsRef.current) {
      const ind = h.industry?.trim() || 'Other';
      const prev = byIndustry[ind] ?? { value: 0, totalGain: 0 };
      byIndustry[ind] = {
        value: prev.value + h.currentValue,
        totalGain: prev.totalGain + h.totalGain,
      };
    }

    const snapshot: DailySnapshot = {
      date: today,
      timestamp: Date.now(),
      totalValue: totalsRef.current.totalValue,
      totalCost: totalsRef.current.totalCost,
      totalGain: totalsRef.current.totalGain,
      byIndustry,
    };

    fetch('/api/portfolio/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
    }).catch(console.error);
  }, [lastUpdated]);

  return data;
}
