import { NextRequest, NextResponse } from 'next/server';
import { safeEqual } from '@/lib/auth';
import { getHoldings } from '@/lib/holdings-service';
import { getPortfolioWithMetrics } from '@/lib/portfolio-server';
import { parsePortfolioParam } from '@/lib/portfolios';

export const dynamic = 'force-dynamic';

// Read-only feed for the Mission Control dashboard's sidebar badge. It returns one number
// (today's net dollar change), never holdings or quotes, and is guarded by a bearer token
// instead of the login cookie so a leaked token exposes a single figure, not the portfolio.
// The proxy lets Authorization-bearing requests reach this route; the real check is here, and
// it fails closed when DAY_CHANGE_TOKEN is unset.
const NO_STORE = { 'Cache-Control': 'no-store' };

async function hasValidToken(req: NextRequest): Promise<boolean> {
  const expected = process.env.DAY_CHANGE_TOKEN;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  return safeEqual(match[1], expected);
}

export async function GET(req: NextRequest) {
  if (!(await hasValidToken(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }
  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400, headers: NO_STORE });

  try {
    // Same math as the dashboard card: sum of quantity x today's price change per lot.
    const [{ holdings: priced, totals }, all] = await Promise.all([
      getPortfolioWithMetrics(portfolio),
      getHoldings(portfolio),
    ]);
    return NextResponse.json(
      {
        dayChange: Math.round(totals.dailyChange * 100) / 100,
        priced: priced.length,
        total: all.length,
        asOf: new Date().toISOString(),
      },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error('[GET /api/day-change]', err);
    return NextResponse.json({ error: 'Failed to compute day change' }, { status: 500, headers: NO_STORE });
  }
}
