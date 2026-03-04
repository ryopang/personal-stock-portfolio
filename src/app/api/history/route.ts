import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

function periodFromRange(range: string): { period1: string; interval: '1d' | '1wk' } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (range === '1W') { const d = new Date(now); d.setDate(d.getDate() - 7);          return { period1: fmt(d), interval: '1d' }; }
  if (range === '1M') { const d = new Date(now); d.setMonth(d.getMonth() - 1);         return { period1: fmt(d), interval: '1d' }; }
  if (range === '3M') { const d = new Date(now); d.setMonth(d.getMonth() - 3);         return { period1: fmt(d), interval: '1d' }; }
  if (range === '6M') { const d = new Date(now); d.setMonth(d.getMonth() - 6);         return { period1: fmt(d), interval: '1d' }; }
  if (range === 'YTD') return { period1: `${now.getFullYear()}-01-01`,                   interval: '1d' };
  if (range === '1Y') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1);   return { period1: fmt(d), interval: '1d' }; }
  if (range === '5Y') { const d = new Date(now); d.setFullYear(d.getFullYear() - 5);   return { period1: fmt(d), interval: '1wk' }; }
  if (range === 'MAX') return { period1: '2000-01-01',                                  interval: '1wk' };

  // default: 1Y
  const d = new Date(now); d.setFullYear(d.getFullYear() - 1);
  return { period1: fmt(d), interval: '1d' };
}

export interface HistoryPoint {
  // YYYY-MM-DD for daily/weekly; full ISO timestamp for intraday (Today)
  date: string;
  close: number;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const range = req.nextUrl.searchParams.get('range') ?? '1Y';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    let points: HistoryPoint[];

    if (range === 'Today') {
      // Use chart() for intraday 5-minute bars — historical() only supports daily/weekly
      // Use ET date as period1 so we don't accidentally include the previous evening's
      // after-hours (midnight UTC = 7–8 PM ET, which is still the prior trading day)
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const result = await yahooFinance.chart(symbol, { period1: todayET, interval: '5m' });
      points = (result.quotes ?? [])
        .filter((q) => q.close != null)
        .map((q) => {
          const d = q.date instanceof Date ? q.date : new Date(q.date);
          return { date: d.toISOString(), close: q.close! };
        })
        // Keep only bars that fall on today in ET timezone
        .filter((p) => {
          const ptET = new Date(p.date).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          return ptET === todayET;
        });
    } else {
      const { period1, interval } = periodFromRange(range);
      const rows = await yahooFinance.historical(symbol, { period1, period2: today, interval });
      points = rows
        .filter((r) => r.close != null)
        .map((r) => {
          const d = r.date instanceof Date ? r.date : new Date(r.date);
          return { date: d.toISOString().slice(0, 10), close: r.close };
        });
    }

    return NextResponse.json({ symbol, points });
  } catch (err) {
    console.error('[GET /api/history]', err);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
