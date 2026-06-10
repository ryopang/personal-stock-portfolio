import yahooFinance from './yahoo';
import { getHoldings } from './holdings-service';
import { toYahooSymbol } from './crypto-symbols';
import { computeHoldingMetrics, computePortfolioTotals } from './calculations';
import type { HoldingWithMetrics, PortfolioTotals, Quote } from './types';
import type { BenchmarkData } from './prompts';

// Server-side portfolio assembly: Redis holdings + live Yahoo quotes → metrics.
// Used by the AI routes so they never have to trust a client-supplied payload.

type RawQuote = Awaited<ReturnType<typeof yahooFinance.quote>>[number];

/** Map a raw yahoo-finance2 quote to the app's Quote shape (shared with /api/quotes). */
export function mapYahooQuote(q: RawQuote): Quote {
  const sym = q.symbol ?? '';
  return {
    symbol: sym,
    name: q.longName ?? q.shortName ?? sym,
    price: q.regularMarketPrice ?? 0,
    previousClose: q.regularMarketPreviousClose ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    marketState: q.marketState ?? 'REGULAR',
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? undefined,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? undefined,
  };
}

export interface PortfolioWithMetrics {
  holdings: HoldingWithMetrics[];
  totals: PortfolioTotals;
}

export async function getPortfolioWithMetrics(): Promise<PortfolioWithMetrics> {
  const holdings = await getHoldings();
  if (!holdings.length) {
    return { holdings: [], totals: computePortfolioTotals([]) };
  }

  const symbols = [...new Set(holdings.map((h) => toYahooSymbol(h.symbol, h.type)))];
  const rawQuotes = await yahooFinance.quote(symbols);

  const quoteMap = new Map<string, Quote>();
  for (const q of rawQuotes) {
    if (q?.symbol) quoteMap.set(q.symbol, mapYahooQuote(q));
  }

  const withMetrics = holdings
    .map((h) => {
      const quote = quoteMap.get(toYahooSymbol(h.symbol, h.type));
      return quote ? computeHoldingMetrics(h, quote) : null;
    })
    .filter((h): h is HoldingWithMetrics => h !== null);

  return { holdings: withMetrics, totals: computePortfolioTotals(withMetrics) };
}

/** YTD and 1-year simple price returns for a benchmark, from one daily-history fetch. */
export async function getBenchmarkReturns(symbol = 'VTI'): Promise<BenchmarkData | null> {
  try {
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const rows = await yahooFinance.historical(symbol, {
      period1: oneYearAgo.toISOString().slice(0, 10),
      period2: now.toISOString().slice(0, 10),
      interval: '1d',
    });

    const closes = rows
      .filter((r) => r.close != null)
      .map((r) => ({
        date: (r.date instanceof Date ? r.date : new Date(r.date)).toISOString().slice(0, 10),
        close: r.close,
      }));
    if (closes.length < 2) return null;

    const last = closes[closes.length - 1].close;
    const oneYear = ((last - closes[0].close) / closes[0].close) * 100;

    const jan1 = `${now.getFullYear()}-01-01`;
    const ytdCloses = closes.filter((c) => c.date >= jan1);
    const ytd = ytdCloses.length >= 2 ? ((last - ytdCloses[0].close) / ytdCloses[0].close) * 100 : null;

    return { symbol, ytd, oneYear };
  } catch (err) {
    console.error('[getBenchmarkReturns]', err);
    return null;
  }
}
