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

interface Props {
  holdings: HoldingWithMetrics[];
  lang: 'en' | 'zh-TW';
  onLangChange: (lang: 'en' | 'zh-TW') => void;
}

export default function AnalysisTab({ holdings, lang, onLangChange }: Props) {
  const [filterSymbol, setFilterSymbol] = useState<string>('all');

  const symbols = [...new Set(holdings.map((h) => toYahooSymbol(h.symbol, h.type)))].join(',');

  const { data } = useSWR<{ articles: NewsItem[] }>(
    symbols ? `/api/news?symbols=${symbols}` : null,
    fetcher,
    { refreshInterval: 0 },
  );

  const articles = data?.articles ?? [];

  const langToggle = (
    <div className="flex items-center rounded-lg border border-border overflow-hidden text-xs font-medium">
      {(['en', 'zh-TW'] as const).map((l) => (
        <button
          key={l}
          onClick={() => onLangChange(l)}
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
  );

  return (
    <div className="space-y-4">
      <MarketNews lang={lang} controls={langToggle} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="h-[480px] lg:col-span-1 lg:h-[900px]"><PortfolioNews holdings={holdings} lang={lang} filterSymbol={filterSymbol} onFilterChange={setFilterSymbol} /></div>
        <div className="lg:col-span-2 lg:h-[900px]"><AIAnalysis holdings={holdings} articles={articles} lang={lang} /></div>
      </div>
    </div>
  );
}
