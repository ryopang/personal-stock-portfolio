import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { dailySnapshotSchema, snapshotsQuerySchema, firstIssue } from '@/lib/schemas';
import type { DailySnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

const HASH_KEY = 'portfolio:snapshots';
const MAX_DAYS = 3650;

export async function GET(req: NextRequest) {
  const { days } = snapshotsQuerySchema.parse({
    days: req.nextUrl.searchParams.get('days') ?? undefined,
  });

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
    const parsed = dailySnapshotSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }
    const snapshot: DailySnapshot = parsed.data;

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
