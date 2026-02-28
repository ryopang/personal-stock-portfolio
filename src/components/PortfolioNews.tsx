'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { HoldingWithMetrics } from '@/lib/types';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { NewsItem } from '@/app/api/news/route';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function displaySymbol(s: string): string {
  return s.replace(/-USD$/, '');
}

function NewsCardSkeleton() {
  return (
    <div className="card p-4 space-y-2 animate-pulse">
      <div className="h-4 rounded-md w-3/4 bg-border" />
      <div className="h-3 rounded-md w-full bg-border/50" />
      <div className="h-3 rounded-md w-4/5 bg-border/50" />
      <div className="flex gap-2 mt-1">
        <div className="h-3 rounded w-12 bg-border" />
        <div className="h-3 rounded w-20 bg-border/50" />
        <div className="h-3 rounded w-10 bg-border/50" />
      </div>
    </div>
  );
}

interface Props {
  holdings: HoldingWithMetrics[];
  lang: 'en' | 'zh-TW';
  filterSymbol: string;
  onFilterChange: (symbol: string) => void;
}

export default function PortfolioNews({ holdings, lang, filterSymbol, onFilterChange }: Props) {

  // "All" mode: paginated articles
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Single-symbol mode: targeted fetch
  const [symbolArticles, setSymbolArticles] = useState<NewsItem[]>([]);
  const [isLoadingSymbol, setIsLoadingSymbol] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const allSymbols = holdings.map((h) => toYahooSymbol(h.symbol, h.type)).join(',');

  // Fetch a page of all-symbols news
  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    if (!allSymbols) return;
    if (replace) setIsLoading(true);
    else setIsLoadingMore(true);

    try {
      const url = `/api/news?symbols=${allSymbols}&page=${pageNum}${lang === 'zh-TW' ? '&translate=zh-TW' : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as { articles: NewsItem[]; hasMore: boolean; page: number };
      setArticles((prev) => replace ? data.articles : [...prev, ...data.articles]);
      setHasMore(data.hasMore);
      setPage(pageNum);
    } finally {
      if (replace) setIsLoading(false);
      else setIsLoadingMore(false);
    }
  }, [allSymbols, lang]);

  // Fetch all news for a single symbol (no pagination cap)
  const fetchForSymbol = useCallback(async (symbol: string) => {
    const holding = holdings.find((h) => h.symbol === symbol);
    if (!holding) return;
    const yahooSym = toYahooSymbol(holding.symbol, holding.type);
    setIsLoadingSymbol(true);
    setSymbolArticles([]);
    try {
      const url = `/api/news?symbols=${yahooSym}&all=1${lang === 'zh-TW' ? '&translate=zh-TW' : ''}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json() as { articles: NewsItem[] };
      setSymbolArticles(data.articles);
    } finally {
      setIsLoadingSymbol(false);
    }
  }, [holdings, lang]);

  // Reset and reload from page 1 when allSymbols or lang change
  useEffect(() => {
    setArticles([]);
    setPage(1);
    setHasMore(false);
    fetchPage(1, true);
  }, [fetchPage]);

  // Targeted fetch when a specific symbol is selected
  useEffect(() => {
    if (filterSymbol === 'all') return;
    fetchForSymbol(filterSymbol);
  }, [filterSymbol, fetchForSymbol]);

  // Attach IntersectionObserver to sentinel (only active in "all" mode)
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (filterSymbol !== 'all') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchPage(page + 1, false);
        }
      },
      { threshold: 0.1 },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [filterSymbol, hasMore, isLoadingMore, page, fetchPage]);

  if (!holdings.length) return null;

  const isFilterMode = filterSymbol !== 'all';
  const loading = isFilterMode ? isLoadingSymbol : isLoading;
  const visibleArticles = isFilterMode ? symbolArticles : articles;
  const showInfiniteScroll = !isFilterMode;

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-3">
      <div className="flex items-center justify-between px-1 shrink-0 gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary whitespace-nowrap shrink-0">Portfolio News</p>
        <select
          value={filterSymbol}
          onChange={(e) => onFilterChange(e.target.value)}
          className="text-xs font-medium rounded-lg border border-border bg-surface text-primary px-2.5 py-1 outline-none cursor-pointer transition-colors"
        >
          <option value="all">All Holdings</option>
          {[...new Map(holdings.map((h) => [h.symbol, h])).values()]
            .sort((a, b) => a.symbol.localeCompare(b.symbol))
            .map((h) => (
              <option key={h.symbol} value={h.symbol}>
                {h.symbol}
              </option>
            ))}
        </select>
      </div>
      <div className="thin-scroll flex-1 min-h-0 overflow-y-auto space-y-3 pr-1.5">
        {loading ? (
          [...Array(5)].map((_, i) => <NewsCardSkeleton key={i} />)
        ) : visibleArticles.length === 0 ? (
          <div className="card py-16 text-center text-secondary text-sm">
            No news found{isFilterMode ? ` for ${filterSymbol}` : ''}.
          </div>
        ) : (
          <>
            {visibleArticles.map((article, i) => (
              <a
                key={i}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="card block p-4 transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-semibold leading-snug mb-1.5 text-primary">
                  {article.title}
                </p>

                {article.summary && (
                  <p className="text-xs leading-relaxed mb-2 text-secondary">
                    {article.summary}
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-secondary">
                  <span className="font-semibold uppercase text-accent">
                    {displaySymbol(article.symbol)}
                  </span>
                  <span>·</span>
                  <span>{article.publisher}</span>
                  <span>·</span>
                  <span>{timeAgo(article.pubDate)}</span>
                </div>
              </a>
            ))}

            {showInfiniteScroll && (
              <>
                <div ref={sentinelRef} className="h-1" />
                {isLoadingMore && (
                  <div className="flex justify-center py-3">
                    <span className="inline-block w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {!hasMore && articles.length > 0 && (
                  <p className="text-center text-[11px] text-secondary py-2">
                    All articles loaded
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
