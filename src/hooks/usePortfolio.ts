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
}

export function usePortfolio(): UsePortfolioReturn {
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
      .filter((h): h is HoldingWithMetrics => h !== null)
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [holdings, quoteMap]);

  const totals = useMemo(
    () => computePortfolioTotals(holdingsWithMetrics),
    [holdingsWithMetrics]
  );

  // Refs hold the latest values without making them effect dependencies.
  // This ensures the effect only fires when lastUpdated changes (new quote fetch),
  // but always captures the current computed holdings/totals.
  const holdingsRef = useRef(holdingsWithMetrics);
  const totalsRef = useRef(totals);
  // eslint-disable-next-line react-hooks/refs
  holdingsRef.current = holdingsWithMetrics;
  // eslint-disable-next-line react-hooks/refs
  totalsRef.current = totals;

  useEffect(() => {
    if (!lastUpdated || holdingsRef.current.length === 0) return;

    const today = new Date().toISOString().split('T')[0];

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

  return {
    holdingsWithMetrics,
    totals,
    isLoading,
    isRefreshing,
    error,
    refresh,
    lastUpdated,
  };
}
