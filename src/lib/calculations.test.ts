import { describe, it, expect } from 'vitest';
import { computeHoldingMetrics, computePortfolioTotals } from './calculations';
import type { Holding, Quote, HoldingWithMetrics } from './types';

const baseHolding: Holding = {
  id: 'h1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  quantity: 10,
  costBasis: 150,
  type: 'stock',
  industry: 'Technology',
};

const baseQuote: Quote = {
  symbol: 'AAPL',
  price: 180,
  change: 2,
  changePercent: 1.12,
  fiftyTwoWeekLow: 120,
  fiftyTwoWeekHigh: 200,
};

describe('computeHoldingMetrics', () => {
  it('computes current value as quantity × price', () => {
    const m = computeHoldingMetrics(baseHolding, baseQuote);
    expect(m.currentValue).toBe(1800);
  });

  it('computes total cost as quantity × costBasis', () => {
    const m = computeHoldingMetrics(baseHolding, baseQuote);
    expect(m.totalCost).toBe(1500);
  });

  it('computes total gain as currentValue − totalCost', () => {
    const m = computeHoldingMetrics(baseHolding, baseQuote);
    expect(m.totalGain).toBe(300);
  });

  it('computes totalGainPercent correctly', () => {
    const m = computeHoldingMetrics(baseHolding, baseQuote);
    expect(m.totalGainPercent).toBeCloseTo(20, 5);
  });

  it('returns 0 totalGainPercent when costBasis is 0', () => {
    const m = computeHoldingMetrics({ ...baseHolding, costBasis: 0 }, baseQuote);
    expect(m.totalGainPercent).toBe(0);
  });

  it('computes daily change as quantity × quote.change', () => {
    const m = computeHoldingMetrics(baseHolding, baseQuote);
    expect(m.dailyChange).toBe(20);
  });

  it('threads dailyChangePercent from quote', () => {
    const m = computeHoldingMetrics(baseHolding, baseQuote);
    expect(m.dailyChangePercent).toBe(1.12);
  });

  it('handles a loss position', () => {
    const m = computeHoldingMetrics(baseHolding, { ...baseQuote, price: 100 });
    expect(m.totalGain).toBe(-500);
    expect(m.totalGainPercent).toBeCloseTo(-33.33, 2);
  });
});

describe('computePortfolioTotals', () => {
  const makeHolding = (currentValue: number, totalCost: number, dailyChange: number): HoldingWithMetrics => ({
    ...baseHolding,
    currentPrice: currentValue,
    currentValue,
    totalCost,
    dailyChange,
    dailyChangePercent: 0,
    totalGain: currentValue - totalCost,
    totalGainPercent: totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : 0,
    fiftyTwoWeekLow: 0,
    fiftyTwoWeekHigh: 999,
  });

  it('sums totalValue across holdings', () => {
    const totals = computePortfolioTotals([makeHolding(1000, 800, 10), makeHolding(2000, 1500, -5)]);
    expect(totals.totalValue).toBe(3000);
  });

  it('sums totalCost across holdings', () => {
    const totals = computePortfolioTotals([makeHolding(1000, 800, 10), makeHolding(2000, 1500, -5)]);
    expect(totals.totalCost).toBe(2300);
  });

  it('computes totalGain correctly', () => {
    const totals = computePortfolioTotals([makeHolding(1000, 800, 10), makeHolding(2000, 1500, -5)]);
    expect(totals.totalGain).toBe(700);
  });

  it('computes totalGainPercent correctly', () => {
    const totals = computePortfolioTotals([makeHolding(1000, 800, 10), makeHolding(2000, 1500, -5)]);
    expect(totals.totalGainPercent).toBeCloseTo((700 / 2300) * 100, 5);
  });

  it('sums dailyChange across holdings', () => {
    const totals = computePortfolioTotals([makeHolding(1000, 800, 10), makeHolding(2000, 1500, -5)]);
    expect(totals.dailyChange).toBe(5);
  });

  it('returns 0 totals for empty array', () => {
    const totals = computePortfolioTotals([]);
    expect(totals.totalValue).toBe(0);
    expect(totals.totalCost).toBe(0);
    expect(totals.totalGain).toBe(0);
    expect(totals.dailyChange).toBe(0);
    expect(totals.totalGainPercent).toBe(0);
    expect(totals.dailyChangePercent).toBe(0);
  });
});
