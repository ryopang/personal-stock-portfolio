'use client';

import React, { useEffect, useState } from 'react';
import type { NewsItem } from '@/app/api/news/route';

// General market index symbols for broad economic news
const MARKET_SYMBOLS = '^GSPC,^DJI,^IXIC';

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
    <div className="animate-pulse flex gap-3 p-3 rounded-xl border border-border bg-surface">
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 rounded w-5/6 bg-border" />
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
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const url = `/api/news?symbols=${MARKET_SYMBOLS}&page=1${lang === 'zh-TW' ? '&translate=zh-TW' : ''}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: { articles: NewsItem[] }) => {
        setArticles((data.articles ?? []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lang]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Market News
        </p>
        {controls}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {loading
          ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
          : articles.map((article, i) => (
              <a
                key={i}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col gap-1 p-3 rounded-xl border border-border bg-surface hover:shadow-md transition-shadow"
              >
                <p className="text-xs font-semibold leading-snug text-primary line-clamp-3">
                  {article.title}
                </p>
                {article.summary && (
                  <p className="text-[11px] leading-relaxed text-secondary line-clamp-2">
                    {article.summary}
                  </p>
                )}
                <p className="text-[10px] text-secondary mt-auto pt-1">
                  {article.publisher} · {timeAgo(article.pubDate)}
                </p>
              </a>
            ))}
      </div>
    </div>
  );
}
