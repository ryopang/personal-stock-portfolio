'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { HoldingWithMetrics } from '@/lib/types';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { NewsItem } from '@/app/api/news/route';
import PortfolioNews from './PortfolioNews';
import AIAnalysis from './AIAnalysis';
import MarketNews from './MarketNews';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AnalysisTab({ holdings }: { holdings: HoldingWithMetrics[] }) {
  const [lang, setLang] = useState<'en' | 'zh-TW'>('zh-TW');
  const [filterSymbol, setFilterSymbol] = useState<string>('all');

  const symbols = holdings.map((h) => toYahooSymbol(h.symbol, h.type)).join(',');

  const { data } = useSWR<{ articles: NewsItem[] }>(
    symbols ? `/api/news?symbols=${symbols}` : null,
    fetcher,
    { refreshInterval: 0 },
  );

  const articles = data?.articles ?? [];

  const toolbar = (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-medium">
        {(['en', 'zh-TW'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="px-2.5 py-1.5 transition-colors"
            style={{
              backgroundColor: lang === l ? '#0071E3' : undefined,
              color: lang === l ? '#fff' : undefined,
            }}
          >
            {l === 'en' ? 'EN' : '繁'}
          </button>
        ))}
      </div>

      <select
        value={filterSymbol}
        onChange={(e) => setFilterSymbol(e.target.value)}
        className="text-xs font-medium rounded-lg border border-border bg-surface text-primary px-2.5 py-1.5 outline-none cursor-pointer transition-colors"
      >
        <option value="all">All Holdings</option>
        {[...new Map(holdings.map((h) => [h.symbol, h])).values()]
          .sort((a, b) => a.symbol.localeCompare(b.symbol))
          .map((h) => (
            <option key={h.symbol} value={h.symbol}>
              {h.symbol} — {h.name}
            </option>
          ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <MarketNews lang={lang} controls={toolbar} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-1 lg:h-[900px]"><PortfolioNews holdings={holdings} lang={lang} filterSymbol={filterSymbol} /></div>
        <div className="lg:col-span-2 lg:h-[900px]"><AIAnalysis holdings={holdings} articles={articles} lang={lang} /></div>
      </div>
    </div>
  );
}
