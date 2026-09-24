import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from '@/lib/yahoo';
import { getHoldings, upsertHolding, clearHoldings } from '@/lib/holdings-service';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import type { Holding, AssetType } from '@/lib/types';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_HOLDINGS } from '@/lib/demo-data';
import { parsePortfolioParam } from '@/lib/portfolios';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ holdings: DEMO_HOLDINGS });
  }
  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  try {
    const holdings = await getHoldings(portfolio);
    return NextResponse.json({ holdings });
  } catch (err) {
    console.error('[GET /api/holdings]', err);
    return NextResponse.json({ error: 'Failed to fetch holdings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Read-only in demo mode' }, { status: 403 });
  }
  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  try {
    const body = await req.json();
    const { symbol, type, quantity, costBasis, purchaseDate } = body as {
      symbol: string;
      type: AssetType;
      quantity: number;
      costBasis: number;
      purchaseDate: string;
    };

    if (!symbol || !type || quantity == null || costBasis == null || !purchaseDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 });
    }
    if (costBasis <= 0) {
      return NextResponse.json({ error: 'Cost basis must be greater than 0' }, { status: 400 });
    }

    const yahooSymbol = toYahooSymbol(symbol, type);
    let name = symbol.toUpperCase();
    try {
      const quote = await yahooFinance.quote(yahooSymbol);
      if (!quote || !quote.regularMarketPrice) {
        return NextResponse.json({ error: `Symbol "${symbol}" not found or has no price data` }, { status: 422 });
      }
      name = quote.longName ?? quote.shortName ?? name;
    } catch {
      return NextResponse.json({ error: `Symbol "${symbol}" could not be validated` }, { status: 422 });
    }

    const holding: Holding = {
      id: crypto.randomUUID(),
      symbol: symbol.toUpperCase(),
      name,
      type,
      quantity: Number(quantity),
      costBasis: Number(costBasis),
      purchaseDate,
      addedAt: new Date().toISOString(),
    };

    await upsertHolding(portfolio, holding);
    return NextResponse.json({ holding }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/holdings]', err);
    return NextResponse.json({ error: 'Failed to create holding' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Read-only in demo mode' }, { status: 403 });
  }
  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  try {
    await clearHoldings(portfolio);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/holdings]', err);
    return NextResponse.json({ error: 'Failed to clear holdings' }, { status: 500 });
  }
}
