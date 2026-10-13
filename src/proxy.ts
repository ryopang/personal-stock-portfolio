import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

// Every API route returns portfolio data or spends AI tokens, so all of /api requires a
// valid session cookie except the login endpoint itself. Demo mode serves only fake data.
export async function proxy(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return NextResponse.next();
  if (req.nextUrl.pathname === '/api/auth') return NextResponse.next();

  if (await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export const config = { matcher: '/api/:path*' };
