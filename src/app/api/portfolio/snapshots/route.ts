import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import type { DailySnapshot } from '@/lib/types';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_HOLDINGS } from '@/lib/demo-data';
import yahooFinance from '@/lib/yahoo';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import { DEFAULT_PORTFOLIO, parsePortfolioParam, portfolioKey } from '@/lib/portfolios';
import { getHoldings } from '@/lib/holdings-service';
import { computeBackfilledSnapshots } from '@/lib/history-backfill';

export const dynamic = 'force-dynamic';

const MAX_DAYS = 7300; // ~20 years — Ryo's first purchase is 2011

// ─── Demo snapshot computation ────────────────────────────────────────────────
// In demo mode, snapshots are derived from real Yahoo Finance historical prices
// rather than Redis so the trend chart reflects actual market data.

let demoSnapshotCache: { data: DailySnapshot[]; expiresAt: number } | null = null;

async function computeDemoSnapshots(days: number): Promise<DailySnapshot[]> {
  if (demoSnapshotCache && Date.now() < demoSnapshotCache.expiresAt) {
    return demoSnapshotCache.data.slice(-days);
  }

  const period2 = new Date();
  const period1 = new Date();
  period1.setDate(period1.getDate() - 98); // extra buffer beyond 90 days

  // Unique Yahoo symbols across all demo holdings
  const symbols = [...new Set(DEMO_HOLDINGS.map((h) => toYahooSymbol(h.symbol, h.type)))];

  // Fetch historical OHLCV for each symbol in parallel; silently skip failures
  const histories = await Promise.all(
    symbols.map((symbol) =>
      yahooFinance
        .historical(symbol, { period1, period2, interval: '1d' })
        .then((data) => ({ symbol, data }))
        .catch(() => ({ symbol, data: [] as { date: Date; close: number | null }[] })),
    ),
  );

  // Build date-string → symbol → close-price lookup
  const priceMap = new Map<string, Map<string, number>>();
  for (const { symbol, data } of histories) {
    for (const row of data) {
      if (row.close == null) continue;
      const dateStr =
        row.date instanceof Date
          ? row.date.toISOString().split('T')[0]
          : String(row.date).split('T')[0];
      if (!priceMap.has(dateStr)) priceMap.set(dateStr, new Map());
      priceMap.get(dateStr)!.set(symbol, row.close);
    }
  }

  const snapshots: DailySnapshot[] = [];
  // Forward-fill prices across non-trading days (weekends/holidays) so stocks/ETFs
  // (Mon-Fri only) don't drop out of the total while crypto (7-day) keeps updating —
  // otherwise the portfolio value falsely craters to crypto-only on every weekend.
  const lastKnownPrice = new Map<string, number>();

  for (const dateStr of [...priceMap.keys()].sort()) {
    const dayPrices = priceMap.get(dateStr)!;
    for (const [symbol, price] of dayPrices) {
      lastKnownPrice.set(symbol, price);
    }

    const byIndustry: Record<string, { value: number; totalGain: number }> = {};
    let totalValue = 0;
    let totalCost = 0;

    for (const lot of DEMO_HOLDINGS) {
      const yahooSym = toYahooSymbol(lot.symbol, lot.type);
      const price = lastKnownPrice.get(yahooSym);
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

  // Cache for 1 hour — serverless instances are ephemeral so this avoids
  // re-fetching on every chart render within the same warm instance
  demoSnapshotCache = { data: snapshots, expiresAt: Date.now() + 3_600_000 };
  return snapshots.slice(-days);
}
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? '90'), MAX_DAYS);

  if (DEMO_MODE) {
    try {
      const snapshots = await computeDemoSnapshots(days);
      return NextResponse.json({ snapshots });
    } catch (err) {
      console.error('[GET /api/portfolio/snapshots] demo computation failed', err);
      return NextResponse.json({ snapshots: [] });
    }
  }

  try {
    const raw = await redis.hgetall(portfolioKey(portfolio, 'snapshots')) as Record<string, DailySnapshot> | null;
    const recorded = Object.values(raw ?? {});

    // Recorded snapshots (quote refreshes, plus Ryo's imported CSV) only cover part of a
    // portfolio's life, so fill the rest from purchase dates and Yahoo prices, back to the
    // first purchase. Recorded snapshots always win. Ryo's imported range is kept exactly
    // as imported, so for him the backfill only extends earlier than his first snapshot.
    let snapshots = recorded;
    try {
      const backfilled = await computeBackfilledSnapshots(portfolio, await getHoldings(portfolio));
      const firstRecorded = recorded.reduce((min, s) => (min === '' || s.date < min ? s.date : min), '');
      // Server dates are UTC while recorded ones use the viewer's day, so never let the
      // backfill run ahead of the latest recorded snapshot.
      const lastRecorded = recorded.reduce((max, s) => (s.date > max ? s.date : max), '');
      const extra = backfilled.filter((s) =>
        (portfolio !== DEFAULT_PORTFOLIO || !firstRecorded || s.date < firstRecorded) &&
        (!lastRecorded || s.date <= lastRecorded),
      );
      const byDate = new Map(extra.map((s) => [s.date, s]));
      for (const s of recorded) byDate.set(s.date, s);
      snapshots = [...byDate.values()];
    } catch (err) {
      console.error('[GET /api/portfolio/snapshots] backfill failed', err);
    }

    snapshots = snapshots.sort((a, b) => a.date.localeCompare(b.date)).slice(-days);

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('[GET /api/portfolio/snapshots]', err);
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // In demo mode, snapshot writes are silently dropped — the chart always
  // reads from the computed Yahoo history, not from persisted snapshots.
  if (DEMO_MODE) {
    return NextResponse.json({ ok: true });
  }

  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  const hashKey = portfolioKey(portfolio, 'snapshots');
  try {
    const snapshot = await req.json() as DailySnapshot;
    if (!snapshot.date || !snapshot.totalValue) {
      return NextResponse.json({ error: 'Invalid snapshot' }, { status: 400 });
    }

    await redis.hset(hashKey, { [snapshot.date]: snapshot });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const all = await redis.hgetall(hashKey) as Record<string, DailySnapshot> | null;
    if (all) {
      const toDelete = Object.keys(all).filter(date => date < cutoffStr);
      if (toDelete.length > 0) {
        await redis.hdel(hashKey, ...toDelete);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/portfolio/snapshots]', err);
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
  }
}
