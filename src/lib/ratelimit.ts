import { Ratelimit } from '@upstash/ratelimit';
import type { NextRequest } from 'next/server';
import redis from './redis';

// The AI endpoints spend paid tokens and sit behind a client-side-only password
// gate, so per-IP throttling is the only hard backstop against abuse.
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  prefix: 'ratelimit:ai',
});

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
