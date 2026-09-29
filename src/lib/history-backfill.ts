import yahooFinance from '@/lib/yahoo';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { DailySnapshot, Holding } from '@/lib/types';

// Rebuilds a portfolio's daily history from its current holdings and Yahoo closing
// prices, starting at the earliest purchase date. Each lot only counts from its own
// purchaseDate. Used for portfolios that have no imported history CSV, so their
// trend chart spans the same range as one that does.

const CACHE_TTL_MS = 3_600_000;
const cache = new Map<string, { sig: string; data: DailySnapshot[]; expiresAt: number }>();

export async function computeBackfilledSnapshots(cacheKey: string, holdings: Holding[]): Promise<DailySnapshot[]> {
  if (holdings.length === 0) return [];

  const sig = holdings.map((h) => `${h.id}:${h.symbol}:${h.quantity}:${h.costBasis}:${h.purchaseDate}`).sort().join('|');
  const hit = cache.get(cacheKey);
  if (hit && hit.sig === sig && Date.now() < hit.expiresAt) return hit.data;

  const period1 = new Date(holdings.map((h) => h.purchaseDate).sort()[0] + 'T00:00:00Z');
  const period2 = new Date();
  const symbols = [...new Set(holdings.map((h) => toYahooSymbol(h.symbol, h.type)))];

  const histories = await Promise.all(
    symbols.map((symbol) =>
      yahooFinance
        .historical(symbol, { period1, period2, interval: '1d' })
        .then((data) => ({ symbol, data }))
        .catch(() => ({ symbol, data: [] as { date: Date; close: number | null }[] })),
    ),
  );

  const priceMap = new Map<string, Map<string, number>>();
  for (const { symbol, data } of histories) {
    for (const row of data) {
      if (row.close == null) continue;
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date).split('T')[0];
      if (!priceMap.has(dateStr)) priceMap.set(dateStr, new Map());
      priceMap.get(dateStr)!.set(symbol, row.close);
    }
  }

  const snapshots: DailySnapshot[] = [];
  // Forward-fill so stocks (Mon–Fri) don't drop out of the total on days crypto still trades
  const lastKnownPrice = new Map<string, number>();

  for (const dateStr of [...priceMap.keys()].sort()) {
    for (const [symbol, price] of priceMap.get(dateStr)!) lastKnownPrice.set(symbol, price);

    const byIndustry: Record<string, { value: number; totalGain: number }> = {};
    let totalValue = 0;
    let totalCost = 0;

    for (const lot of holdings) {
      if (lot.purchaseDate > dateStr) continue;
      const price = lastKnownPrice.get(toYahooSymbol(lot.symbol, lot.type));
      if (price == null) continue;

      const value = lot.quantity * price;
      const cost = lot.quantity * lot.costBasis;
      totalValue += value;
      totalCost += cost;

      const ind = lot.industry ?? 'Other';
      if (!byIndustry[ind]) byIndustry[ind] = { value: 0, totalGain: 0 };
      byIndustry[ind].value += value;
      byIndustry[ind].totalGain += value - cost;
    }

    if (totalValue === 0) continue;

    snapshots.push({
      date: dateStr,
      timestamp: new Date(dateStr + 'T16:00:00Z').getTime(),
      totalValue,
      totalCost,
      totalGain: totalValue - totalCost,
      byIndustry,
    });
  }

  cache.set(cacheKey, { sig, data: snapshots, expiresAt: Date.now() + CACHE_TTL_MS });
  return snapshots;
}
