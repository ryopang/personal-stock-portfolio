// The people whose portfolios this dashboard tracks. Ryo's Redis keys predate
// multi-portfolio support, so they stay un-prefixed — existing data needs no migration.

export const PORTFOLIO_IDS = ['ryo', 'joey', 'shela'] as const;
export type PortfolioId = (typeof PORTFOLIO_IDS)[number];

export const DEFAULT_PORTFOLIO: PortfolioId = 'ryo';

export const PORTFOLIO_LABELS: Record<PortfolioId, string> = {
  ryo: 'Ryo',
  joey: 'Joey',
  shela: 'Shela',
};

export function isPortfolioId(value: unknown): value is PortfolioId {
  return typeof value === 'string' && (PORTFOLIO_IDS as readonly string[]).includes(value);
}

/** Redis key for a per-portfolio dataset, e.g. `holdings` → `portfolio:joey:holdings`. */
export function portfolioKey(id: PortfolioId, dataset: 'holdings' | 'snapshots' | 'analysis'): string {
  return id === 'ryo' ? `portfolio:${dataset}` : `portfolio:${id}:${dataset}`;
}

/**
 * Reads `?portfolio=` from a request URL. Missing → Ryo; present but unknown → null,
 * so routes can reject it instead of silently writing to the wrong person.
 */
export function parsePortfolioParam(searchParams: URLSearchParams): PortfolioId | null {
  const raw = searchParams.get('portfolio');
  if (raw === null) return DEFAULT_PORTFOLIO;
  return isPortfolioId(raw) ? raw : null;
}
