import { Redis } from '@upstash/redis';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// In demo mode without Redis credentials, return a proxy that throws a clear
// error on any call — it should never be reached since all demo API routes
// return early before touching Redis.
let redis: Redis;
if (DEMO_MODE && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) {
  redis = new Proxy({} as Redis, {
    get(_, prop) {
      return () => {
        throw new Error(
          `[Demo] Redis.${String(prop)}() was called — all demo API routes should return before touching Redis. This is a bug.`,
        );
      };
    },
  });
} else {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export default redis;
