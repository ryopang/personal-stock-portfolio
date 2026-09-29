// The people whose portfolios this dashboard tracks. Ryo's Redis keys predate
// multi-portfolio support, so they stay un-prefixed — existing data needs no migration.

export const PORTFOLIO_IDS = ['ryo', 'joey', 'rj', 'shela'] as const;
export type PortfolioId = (typeof PORTFOLIO_IDS)[number];

export const DEFAULT_PORTFOLIO: PortfolioId = 'ryo';

export const PORTFOLIO_LABELS: Record<PortfolioId, string> = {
  ryo: 'Ryo',
  joey: 'Joey',
  shela: 'Shela',
  rj: 'r+J',
};

/** Name used in AI prompts ("<name>'s portfolio"), where the short switcher label reads badly. */
export const PORTFOLIO_OWNER_NAMES: Record<PortfolioId, string> = {
  ryo: 'Ryo',
  joey: 'Joey',
  shela: 'Shela',
  rj: 'Ryo & Joey',
};

/** Virtual portfolios have no data of their own: they are the union of these members. */
const COMBINED_MEMBERS: Partial<Record<PortfolioId, readonly PortfolioId[]>> = {
  rj: ['ryo', 'joey'],
};

export function isCombinedPortfolio(id: PortfolioId): boolean {
  return id in COMBINED_MEMBERS;
}

/** The stored portfolios behind an id: the member list for a combined one, else just itself. */
export function portfolioMembers(id: PortfolioId): readonly PortfolioId[] {
  return COMBINED_MEMBERS[id] ?? [id];
}

export function isPortfolioId(value: unknown): value is PortfolioId {
  return typeof value === 'string' && (PORTFOLIO_IDS as readonly string[]).includes(value);
}

/** Redis key for a per-portfolio dataset, e.g. `holdings` → `portfolio:joey:holdings`. */
export function portfolioKey(id: PortfolioId, dataset: 'holdings' | 'snapshots' | 'analysis'): string {
  return id === 'ryo' ? `portfolio:${dataset}` : `portfolio:${id}:${dataset}`;
}

/** Response for write routes hit with a combined portfolio, which has nowhere to store data. */
export const COMBINED_READ_ONLY_ERROR = 'The combined portfolio is read-only. Switch to Ryo or Joey to make changes.';

/**
 * Reads `?portfolio=` from a request URL. Missing → Ryo; present but unknown → null,
 * so routes can reject it instead of silently writing to the wrong person.
 */
export function parsePortfolioParam(searchParams: URLSearchParams): PortfolioId | null {
  const raw = searchParams.get('portfolio');
  if (raw === null) return DEFAULT_PORTFOLIO;
  return isPortfolioId(raw) ? raw : null;
}

/** Appends `portfolio=<id>` to an API url that may or may not already have a query string. */
export function withPortfolio(url: string, id: PortfolioId): string {
  return `${url}${url.includes('?') ? '&' : '?'}portfolio=${id}`;
}
