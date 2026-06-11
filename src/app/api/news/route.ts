import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchNewsForSymbols, translateArticles } from '@/lib/news';
import { newsParamsSchema } from '@/lib/schemas';
import type { NewsItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Re-exported for existing importers; canonical definition lives in lib/types.
export type { NewsItem };

const PAGE_SIZE = 6;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbolsParam = searchParams.get('symbols') ?? '';
  const { page, translate } = newsParamsSchema.parse({
    page: searchParams.get('page') ?? undefined,
    translate: searchParams.get('translate') || undefined,
  });
  const all = searchParams.get('all') === '1';

  if (!symbolsParam) {
    return NextResponse.json({ articles: [], hasMore: false, page });
  }

  const filtered = await fetchNewsForSymbols(symbolsParam.split(','));

  if (all) {
    const output = translate ? await translateArticles(filtered, translate) : filtered;
    return NextResponse.json({ articles: output, hasMore: false, page: 1 });
  }

  const start = (page - 1) * PAGE_SIZE;
  const pageArticles = filtered.slice(start, start + PAGE_SIZE);
  const hasMore = filtered.length > start + PAGE_SIZE;

  const output = translate ? await translateArticles(pageArticles, translate) : pageArticles;

  return NextResponse.json({ articles: output, hasMore, page });
}
