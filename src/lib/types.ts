export type AssetType = 'stock' | 'etf' | 'crypto';

export interface Holding {
  id: string;
  symbol: string;       // User-facing symbol: AAPL, BTC (no -USD suffix)
  name: string;         // Display name fetched from Yahoo on creation
  type: AssetType;
  industry?: string;    // Free-text label, e.g. "Semiconductors"
  quantity: number;
  costBasis: number;    // Per share/unit average cost
  purchaseDate: string; // ISO date string (YYYY-MM-DD)
  addedAt: string;      // ISO timestamp
}

export interface Quote {
  symbol: string;       // Yahoo format: AAPL, BTC-USD
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  marketState: string;  // 'REGULAR' | 'PRE' | 'POST' | 'CLOSED'
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
}

export interface HoldingWithMetrics extends Holding {
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalGain: number;
  totalGainPercent: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
}

export interface PortfolioTotals {
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: AssetType;
}

export interface DailySnapshot {
  date: string;       // YYYY-MM-DD — used as the Redis hash field key
  timestamp: number;  // Unix ms
  totalValue: number;
  totalCost: number;
  totalGain: number;
  byIndustry: Record<string, { value: number; totalGain: number }>;
}
