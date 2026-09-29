import redis from './redis';
import type { Holding } from './types';
import { isCombinedPortfolio, portfolioKey, portfolioMembers, type PortfolioId } from './portfolios';

const holdingsKey = (p: PortfolioId) => portfolioKey(p, 'holdings');

/** Lots are UUID-keyed, so a combined portfolio is just its members' lots side by side. */
export async function getHoldings(portfolio: PortfolioId): Promise<Holding[]> {
  if (isCombinedPortfolio(portfolio)) {
    const members = portfolioMembers(portfolio) as ('ryo' | 'joey')[];
    const lots = (await Promise.all(
      members.map(async (owner) => (await getHoldings(owner)).map((h) => ({ ...h, owner }))),
    )).flat();
    return lots.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  }
  const data = await redis.hgetall(holdingsKey(portfolio));
  if (!data) return [];
  return (Object.values(data) as Holding[])
    .filter((h) => h != null && typeof h === 'object')
    .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
}

export async function getHolding(portfolio: PortfolioId, id: string): Promise<Holding | null> {
  const data = await redis.hget(holdingsKey(portfolio), id);
  if (!data) return null;
  return data as Holding;
}

export async function upsertHolding(portfolio: PortfolioId, holding: Holding): Promise<void> {
  await redis.hset(holdingsKey(portfolio), { [holding.id]: holding });
}

export async function deleteHolding(portfolio: PortfolioId, id: string): Promise<void> {
  await redis.hdel(holdingsKey(portfolio), id);
}

export async function clearHoldings(portfolio: PortfolioId): Promise<void> {
  await redis.del(holdingsKey(portfolio));
}
