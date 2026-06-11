import { describe, it, expect } from 'vitest';
import { toYahooSymbol, fromYahooSymbol, inferAssetType } from './crypto-symbols';

describe('toYahooSymbol', () => {
  it('appends -USD for crypto', () => {
    expect(toYahooSymbol('BTC', 'crypto')).toBe('BTC-USD');
  });

  it('uppercases crypto symbols', () => {
    expect(toYahooSymbol('eth', 'crypto')).toBe('ETH-USD');
  });

  it('leaves stock symbols as-is (uppercase)', () => {
    expect(toYahooSymbol('aapl', 'stock')).toBe('AAPL');
  });

  it('leaves ETF symbols as-is', () => {
    expect(toYahooSymbol('vti', 'etf')).toBe('VTI');
  });

  it('does not double-append -USD', () => {
    expect(toYahooSymbol('BTC-USD', 'crypto')).toBe('BTC-USD');
  });
});

describe('fromYahooSymbol', () => {
  it('strips -USD suffix', () => {
    expect(fromYahooSymbol('BTC-USD')).toBe('BTC');
  });

  it('leaves plain symbols unchanged', () => {
    expect(fromYahooSymbol('AAPL')).toBe('AAPL');
  });
});

describe('inferAssetType', () => {
  it('detects CRYPTOCURRENCY quoteType as crypto', () => {
    expect(inferAssetType('CRYPTOCURRENCY', 'BTC-USD')).toBe('crypto');
  });

  it('detects ETF quoteType as etf', () => {
    expect(inferAssetType('ETF', 'VTI')).toBe('etf');
  });

  it('detects MUTUALFUND quoteType as etf', () => {
    expect(inferAssetType('MUTUALFUND', 'VTSAX')).toBe('etf');
  });

  it('detects known crypto symbol even when quoteType is EQUITY', () => {
    expect(inferAssetType('EQUITY', 'BTC')).toBe('crypto');
  });

  it('defaults to stock for unknown quoteType', () => {
    expect(inferAssetType('EQUITY', 'AAPL')).toBe('stock');
  });

  it('defaults to stock when quoteType is undefined', () => {
    expect(inferAssetType(undefined, 'AAPL')).toBe('stock');
  });
});
