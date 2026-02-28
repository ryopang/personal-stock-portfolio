import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import type { DailySnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

const HASH_KEY = 'portfolio:snapshots';

export async function POST(req: NextRequest) {
  try {
    const { snapshots } = await req.json() as { snapshots: DailySnapshot[] };

    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return NextResponse.json({ error: 'Expected non-empty snapshots array' }, { status: 400 });
    }

    const valid: DailySnapshot[] = [];
    const skipped: string[] = [];

    for (const s of snapshots) {
      if (!s.date || typeof s.totalValue !== 'number') {
        skipped.push(s.date ?? '(no date)');
        continue;
      }
      valid.push(s);
    }

    if (valid.length > 0) {
      const record: Record<string, DailySnapshot> = {};
      for (const s of valid) record[s.date] = s;
      await redis.hset(HASH_KEY, record);
    }

    // No pruning here — historical imports must be preserved as-is

    return NextResponse.json({ imported: valid.length, skipped });
  } catch (err) {
    console.error('[POST /api/portfolio/snapshots/import]', err);
    return NextResponse.json({ error: 'Failed to import snapshots' }, { status: 500 });
  }
}
