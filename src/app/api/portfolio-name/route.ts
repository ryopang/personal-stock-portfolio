import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import redis from '@/lib/redis';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_PORTFOLIO_NAME } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

const KEY = 'portfolio:name';
const DEFAULT_NAME = "Ryo's Investment Portfolio";

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({ name: DEMO_PORTFOLIO_NAME });
  }
  const name = await redis.get<string>(KEY);
  return NextResponse.json({ name: name ?? DEFAULT_NAME });
}

export async function PUT(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({ error: 'Read-only in demo mode' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name (string) is required' }, { status: 400 });
  }
  const trimmed = body.name.trim().slice(0, 100);
  await redis.set(KEY, trimmed);
  return NextResponse.json({ name: trimmed });
}
