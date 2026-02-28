import type { Holding, Quote, HoldingWithMetrics, PortfolioTotals } from './types';

export function computeHoldingMetrics(holding: Holding, quote: Quote): HoldingWithMetrics {
  const currentPrice = quote.price;
  const currentValue = holding.quantity * currentPrice;
  const totalCost = holding.quantity * holding.costBasis;
  const totalGain = currentValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  // quote.change is already the per-share $ change vs previous close
  const dailyChange = holding.quantity * quote.change;
  const dailyChangePercent = quote.changePercent;

  return {
    ...holding,
    currentPrice,
    currentValue,
    totalCost,
    dailyChange,
    dailyChangePercent,
    totalGain,
    totalGainPercent,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
  };
}

export function computePortfolioTotals(holdings: HoldingWithMetrics[]): PortfolioTotals {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalGain = totalValue - totalCost;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
  const dailyChange = holdings.reduce((sum, h) => sum + h.dailyChange, 0);
  // Daily change % = daily change / (portfolio value at start of day)
  const portfolioValueAtOpen = totalValue - dailyChange;
  const dailyChangePercent = portfolioValueAtOpen > 0 ? (dailyChange / portfolioValueAtOpen) * 100 : 0;

  return {
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    dailyChange,
    dailyChangePercent,
  };
}
