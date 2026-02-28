import { Redis } from '@upstash/redis';

// Singleton — avoids creating multiple connections in serverless environments
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;
