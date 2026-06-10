import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';
import { mapYahooQuote } from '@/lib/portfolio-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get('symbols');
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const rawResults = await yahooFinance.quote(symbols);

    const quotes = rawResults.filter((q) => q != null).map(mapYahooQuote);

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error('[GET /api/quotes]', err);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
