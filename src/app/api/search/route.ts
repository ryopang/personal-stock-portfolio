import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';
import { inferAssetType } from '@/lib/crypto-symbols';
import { searchQuerySchema } from '@/lib/schemas';
import type { SearchResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_QUOTE_TYPES = new Set(['EQUITY', 'ETF', 'MUTUALFUND', 'CRYPTOCURRENCY']);

export async function GET(req: NextRequest) {
  const parsed = searchQuerySchema.safeParse({ q: req.nextUrl.searchParams.get('q') ?? '' });
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }
  const { q } = parsed.data;

  try {
    // Use autoc (autocomplete) for symbol lookup — it returns cleaner results
    const response = await yahooFinance.search(q, { newsCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quotes: any[] = response.quotes ?? [];

    const results: SearchResult[] = quotes
      .filter((r) => ALLOWED_QUOTE_TYPES.has(r.quoteType ?? ''))
      .slice(0, 8)
      .map((r) => ({
        symbol: (r.symbol ?? '') as string,
        name: ((r.longname ?? r.shortname ?? r.symbol ?? '') as string),
        type: inferAssetType(r.quoteType as string | undefined, r.symbol ?? ''),
      }))
      .filter((r) => r.symbol.length > 0);

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[GET /api/search]', err);
    return NextResponse.json({ results: [] });
  }
}
