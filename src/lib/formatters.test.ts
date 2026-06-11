import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyK,
  formatChange,
  formatChangeWhole,
  formatPercent,
  formatPercentAbs,
  formatQuantity,
} from './formatters';

describe('formatCurrency', () => {
  it('formats a positive number with $ and 2 decimal places', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatCurrencyK', () => {
  it('formats values under 1M as K', () => {
    expect(formatCurrencyK(1500)).toBe('$1.5K');
  });

  it('strips trailing .0 in K format', () => {
    expect(formatCurrencyK(2000)).toBe('$2K');
  });

  it('formats values >= 1M as M', () => {
    expect(formatCurrencyK(1_500_000)).toBe('$1.5M');
  });

  it('strips trailing .00 in M format', () => {
    expect(formatCurrencyK(2_000_000)).toBe('$2M');
  });
});

describe('formatChange', () => {
  it('prefixes positive values with +', () => {
    expect(formatChange(50)).toBe('+$50.00');
  });

  it('prefixes negative values with -', () => {
    expect(formatChange(-30)).toBe('-$30.00');
  });
});

describe('formatChangeWhole', () => {
  it('rounds to whole numbers', () => {
    expect(formatChangeWhole(1234.9)).toBe('+$1,235');
  });
});

describe('formatPercent', () => {
  it('prefixes positive with +', () => {
    expect(formatPercent(5.25)).toBe('+5.25%');
  });

  it('shows negative sign for negatives', () => {
    expect(formatPercent(-3.1)).toBe('-3.10%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('formatPercentAbs', () => {
  it('strips sign for negatives', () => {
    expect(formatPercentAbs(-12.5)).toBe('12.50%');
  });
});

describe('formatQuantity', () => {
  it('returns integer formatting for whole numbers', () => {
    expect(formatQuantity(100)).toBe('100');
  });

  it('strips trailing zeros from fractional quantities', () => {
    expect(formatQuantity(0.5)).toBe('0.5');
  });

  it('handles fractional crypto quantities', () => {
    expect(formatQuantity(0.00123456)).toBe('0.00123456');
  });
});
