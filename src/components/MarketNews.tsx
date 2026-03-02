'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { NewsItem } from '@/app/api/news/route';

// General market index symbols for broad economic news
const MARKET_SYMBOLS = '^GSPC,^DJI,^IXIC';
const PAGE_DISPLAY = 3; // articles shown at a time

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH = Math.floor(diffMs / 3_600_000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function SkeletonCard() {
  return (
    <div className="animate-pulse flex gap-3 p-4 rounded-xl border border-border bg-surface">
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded w-5/6 bg-border" />
        <div className="h-3 rounded w-full bg-border/50" />
        <div className="h-3 rounded w-2/3 bg-border/30" />
      </div>
    </div>
  );
}

interface Props {
  lang: 'en' | 'zh-TW';
  controls?: React.ReactNode;
}

export default function MarketNews({ lang, controls }: Props) {
  const [allArticles, setAllArticles] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [apiPage, setApiPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // Track which lang the current articles were fetched for so we can reset on lang change
  const langRef = useRef(lang);

  useEffect(() => {
    langRef.current = lang;
    setLoading(true);
    setAllArticles([]);
    setOffset(0);
    setHasMore(false);
    setApiPage(1);
    const url = `/api/news?symbols=${MARKET_SYMBOLS}&page=1${lang === 'zh-TW' ? '&translate=zh-TW' : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { articles: NewsItem[]; hasMore: boolean }) => {
        if (langRef.current !== lang) return; // stale response
        setAllArticles(data.articles ?? []);
        setHasMore(data.hasMore ?? false);
        setApiPage(1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lang]);

  async function handleLoadMore() {
    const nextOffset = offset + PAGE_DISPLAY;

    // If we already have enough articles buffered, just advance the offset
    if (nextOffset + PAGE_DISPLAY <= allArticles.length || !hasMore) {
      setOffset(nextOffset);
      return;
    }

    // Need to fetch the next API page
    setLoadingMore(true);
    const nextApiPage = apiPage + 1;
    const url = `/api/news?symbols=${MARKET_SYMBOLS}&page=${nextApiPage}${lang === 'zh-TW' ? '&translate=zh-TW' : ''}`;
    try {
      const r = await fetch(url);
      const data: { articles: NewsItem[]; hasMore: boolean } = await r.json();
      setAllArticles((prev) => [...prev, ...(data.articles ?? [])]);
      setHasMore(data.hasMore ?? false);
      setApiPage(nextApiPage);
    } catch {
      // silently ignore — keep existing articles
    } finally {
      setLoadingMore(false);
      setOffset(nextOffset);
    }
  }

  const visible = allArticles.slice(offset, offset + PAGE_DISPLAY);
  const canLoadMore = hasMore || offset + PAGE_DISPLAY < allArticles.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary whitespace-nowrap shrink-0">
          Market News
        </p>
        <div className="flex items-center gap-2">
          {!loading && canLoadMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
          {controls}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {loading
          ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          : visible.map((article, i) => (
              <a
                key={`${offset}-${i}`}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-surface hover:shadow-md transition-shadow"
              >
                <p className="text-sm font-semibold leading-snug text-primary line-clamp-3">
                  {article.title}
                </p>
                {article.summary && (
                  <p className="text-xs leading-relaxed text-secondary line-clamp-2">
                    {article.summary}
                  </p>
                )}
                <p className="text-[11px] text-secondary mt-auto pt-0.5">
                  {article.publisher} · {timeAgo(article.pubDate)}
                </p>
              </a>
            ))}
      </div>
    </div>
  );
}
