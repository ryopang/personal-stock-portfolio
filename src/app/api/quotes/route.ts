import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';
import { mapYahooQuote } from '@/lib/portfolio-server';
import { symbolsParamSchema, firstIssue } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get('symbols');
  if (!symbolsParam) {
    return NextResponse.json({ error: 'symbols param required' }, { status: 400 });
  }

  const parsed = symbolsParamSchema.safeParse(symbolsParam);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }
  const symbols = parsed.data;

  try {
    const rawResults = await yahooFinance.quote(symbols);

    const quotes = rawResults.filter((q) => q != null).map(mapYahooQuote);

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error('[GET /api/quotes]', err);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
