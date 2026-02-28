import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import type { DailySnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

const HASH_KEY = 'portfolio:snapshots';
const MAX_DAYS = 3650;

export async function GET(req: NextRequest) {
  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? '90'), MAX_DAYS);

  try {
    const raw = await redis.hgetall(HASH_KEY) as Record<string, DailySnapshot> | null;
    if (!raw) return NextResponse.json({ snapshots: [] });

    const snapshots = Object.values(raw)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-days);

    return NextResponse.json({ snapshots });
  } catch (err) {
    console.error('[GET /api/portfolio/snapshots]', err);
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const snapshot = await req.json() as DailySnapshot;
    if (!snapshot.date || !snapshot.totalValue) {
      return NextResponse.json({ error: 'Invalid snapshot' }, { status: 400 });
    }

    // Upsert: field = date string → one entry per day, latest write wins
    await redis.hset(HASH_KEY, { [snapshot.date]: snapshot });

    // Prune entries older than MAX_DAYS
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const all = await redis.hgetall(HASH_KEY) as Record<string, DailySnapshot> | null;
    if (all) {
      const toDelete = Object.keys(all).filter(date => date < cutoffStr);
      if (toDelete.length > 0) {
        await redis.hdel(HASH_KEY, ...toDelete);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/portfolio/snapshots]', err);
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 });
  }
}
