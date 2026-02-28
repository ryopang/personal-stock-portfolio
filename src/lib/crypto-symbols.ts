import type { AssetType } from './types';

// Common crypto symbols → Yahoo Finance ticker (append -USD)
// The fallback logic handles any unlisted coin automatically
export const KNOWN_CRYPTO_SYMBOLS = new Set([
  'BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'AVAX', 'MATIC', 'LINK',
  'XRP', 'DOGE', 'SHIB', 'LTC', 'BCH', 'ATOM', 'UNI', 'AAVE',
  'ALGO', 'FTM', 'NEAR', 'ICP', 'VET', 'TRX', 'XLM', 'ETC',
  'HBAR', 'APT', 'ARB', 'OP', 'SUI', 'INJ', 'SEI', 'TIA',
  'PEPE', 'WIF', 'BONK', 'JTO', 'PYTH',
]);

/**
 * Convert a user-facing symbol to the Yahoo Finance format.
 * Stocks and ETFs are returned as-is.
 * Crypto symbols get a -USD suffix.
 */
export function toYahooSymbol(symbol: string, type: AssetType): string {
  if (type === 'crypto') {
    const upper = symbol.toUpperCase();
    // Already has -USD suffix? Return as-is
    if (upper.endsWith('-USD')) return upper;
    return `${upper}-USD`;
  }
  return symbol.toUpperCase();
}

/**
 * Strip the -USD suffix for display purposes.
 */
export function fromYahooSymbol(yahooSymbol: string): string {
  return yahooSymbol.replace(/-USD$/, '');
}

/**
 * Detect likely asset type from a Yahoo Finance quoteType string.
 */
export function inferAssetType(quoteType: string | undefined, symbol: string): AssetType {
  if (!quoteType) return 'stock';
  const qt = quoteType.toUpperCase();
  if (qt === 'CRYPTOCURRENCY') return 'crypto';
  if (qt === 'ETF' || qt === 'MUTUALFUND') return 'etf';
  // Some ETFs appear as EQUITY — check known patterns
  const upper = symbol.toUpperCase();
  if (KNOWN_CRYPTO_SYMBOLS.has(upper)) return 'crypto';
  return 'stock';
}
