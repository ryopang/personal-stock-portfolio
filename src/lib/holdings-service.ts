import redis from './redis';
import type { Holding } from './types';

const HOLDINGS_KEY = 'portfolio:holdings';

export async function getHoldings(): Promise<Holding[]> {
  const data = await redis.hgetall(HOLDINGS_KEY);
  if (!data) return [];
  return (Object.values(data) as Holding[])
    .filter((h) => h != null && typeof h === 'object')
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
}

export async function getHolding(id: string): Promise<Holding | null> {
  const data = await redis.hget(HOLDINGS_KEY, id);
  if (!data) return null;
  return data as Holding;
}

export async function upsertHolding(holding: Holding): Promise<void> {
  await redis.hset(HOLDINGS_KEY, { [holding.id]: holding });
}

export async function deleteHolding(id: string): Promise<void> {
  await redis.hdel(HOLDINGS_KEY, id);
}

export async function clearHoldings(): Promise<void> {
  await redis.del(HOLDINGS_KEY);
}
