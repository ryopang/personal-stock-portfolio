import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import redis from '@/lib/redis';
import { clientIp } from '@/lib/ratelimit';
import { SESSION_COOKIE, createSessionToken, isAuthDisabled, safeEqual, sessionCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const loginRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, '15 m'),
  prefix: 'ratelimit:login',
});

export async function POST(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password && !isAuthDisabled()) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD is not configured' }, { status: 500 });
  }

  const { success } = await loginRatelimit.limit(clientIp(req));
  if (!success) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const input = typeof body?.password === 'string' ? body.password : '';
  if (!password || !(await safeEqual(input, password))) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
