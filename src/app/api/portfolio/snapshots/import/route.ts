import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { dailySnapshotSchema, snapshotImportSchema, firstIssue } from '@/lib/schemas';
import type { DailySnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';

const HASH_KEY = 'portfolio:snapshots';

export async function POST(req: NextRequest) {
  try {
    const parsedBody = snapshotImportSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: firstIssue(parsedBody.error) }, { status: 400 });
    }

    // Per-row validation: bad rows are skipped (and reported), not fatal
    const valid: DailySnapshot[] = [];
    const skipped: string[] = [];

    for (const raw of parsedBody.data.snapshots) {
      const row = dailySnapshotSchema.safeParse(raw);
      if (!row.success) {
        const date = (raw as { date?: string })?.date;
        skipped.push(typeof date === 'string' ? date : '(no date)');
        continue;
      }
      valid.push(row.data);
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
