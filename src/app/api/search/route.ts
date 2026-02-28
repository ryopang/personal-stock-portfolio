import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';
import { inferAssetType } from '@/lib/crypto-symbols';
import type { SearchResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_QUOTE_TYPES = new Set(['EQUITY', 'ETF', 'MUTUALFUND', 'CRYPTOCURRENCY']);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

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
