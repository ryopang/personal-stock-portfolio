'use client';

import useSWR from 'swr';
import { useEffect, useState } from 'react';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { Holding, Quote } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UseQuotesReturn {
  quotes: Quote[] | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | undefined;
  refresh: () => Promise<void>;
  lastUpdated: Date | undefined;
}

export function useQuotes(holdings: Holding[]): UseQuotesReturn {
  const symbols = [...new Set(holdings.map((h) => toYahooSymbol(h.symbol, h.type)))].join(',');

  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ quotes: Quote[] }>(
    symbols ? `/api/quotes?symbols=${symbols}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Manual refresh only
      dedupingInterval: 5000,
    }
  );

  // Update lastUpdated whenever fresh data arrives
  useEffect(() => {
    if (data?.quotes) {
      setLastUpdated(new Date());
    }
  }, [data]);

  const refresh = async () => {
    await mutate();
  };

  return {
    quotes: data?.quotes,
    isLoading,
    isRefreshing: isValidating,
    error,
    refresh,
    lastUpdated,
  };
}
