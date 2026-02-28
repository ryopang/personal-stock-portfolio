import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';

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
    // Batch quote fetch for real-time prices + parallel summaryDetail for 52-week range
    const [rawResults, fiftyTwoWeekResults] = await Promise.all([
      yahooFinance.quote(symbols),
      Promise.allSettled(
        symbols.map((sym) =>
          yahooFinance
            .quoteSummary(sym, { modules: ['summaryDetail'] })
            .then((s) => ({
              symbol: sym,
              low: s.summaryDetail?.fiftyTwoWeekLow ?? null,
              high: s.summaryDetail?.fiftyTwoWeekHigh ?? null,
            }))
        )
      ),
    ]);

    // Build a map of symbol → 52-week low/high
    const fiftyTwoWeekMap = new Map<string, { low: number | null; high: number | null }>();
    for (const result of fiftyTwoWeekResults) {
      if (result.status === 'fulfilled') {
        fiftyTwoWeekMap.set(result.value.symbol, {
          low: result.value.low,
          high: result.value.high,
        });
      }
    }

    const quotes = rawResults
      .filter((q) => q != null)
      .map((q) => {
        const sym = q.symbol ?? '';
        const range52 = fiftyTwoWeekMap.get(sym);
        return {
          symbol: sym,
          name: q.longName ?? q.shortName ?? sym,
          price: q.regularMarketPrice ?? 0,
          previousClose: q.regularMarketPreviousClose ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          marketState: q.marketState ?? 'REGULAR',
          fiftyTwoWeekLow: range52?.low ?? undefined,
          fiftyTwoWeekHigh: range52?.high ?? undefined,
        };
      });

    return NextResponse.json({ quotes });
  } catch (err) {
    console.error('[GET /api/quotes]', err);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
