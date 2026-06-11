import { describe, it, expect } from 'vitest';
import {
  firstIssue,
  holdingCreateSchema,
  holdingUpdateSchema,
  dailySnapshotSchema,
  analysisRequestSchema,
  symbolsParamSchema,
  historyParamsSchema,
  newsParamsSchema,
  snapshotsQuerySchema,
  searchQuerySchema,
  macroContextSchema,
} from './schemas';
import { z } from 'zod';

describe('firstIssue', () => {
  it('returns "path: message" when path exists', () => {
    const result = z.object({ n: z.number() }).safeParse({ n: 'bad' });
    if (result.success) throw new Error('expected failure');
    expect(firstIssue(result.error)).toMatch(/n:/);
  });

  it('returns just message when path is empty', () => {
    const result = z.string().min(1).safeParse('');
    if (result.success) throw new Error('expected failure');
    expect(firstIssue(result.error)).not.toMatch(/^\./);
  });
});

describe('holdingCreateSchema', () => {
  const valid = {
    symbol: 'AAPL',
    type: 'stock',
    quantity: 10,
    costBasis: 150,
    purchaseDate: '2024-01-15',
  };

  it('accepts a valid holding', () => {
    expect(holdingCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects missing symbol', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { symbol: _s, ...rest } = valid;
    expect(holdingCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects zero quantity', () => {
    expect(holdingCreateSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('rejects bad purchaseDate format', () => {
    expect(holdingCreateSchema.safeParse({ ...valid, purchaseDate: '01/15/2024' }).success).toBe(false);
  });

  it('accepts optional industry field', () => {
    const r = holdingCreateSchema.safeParse({ ...valid, industry: 'Technology' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.industry).toBe('Technology');
  });
});

describe('holdingUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(holdingUpdateSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update', () => {
    const r = holdingUpdateSchema.safeParse({ quantity: 5 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.quantity).toBe(5);
  });
});

describe('dailySnapshotSchema', () => {
  it('accepts a valid snapshot', () => {
    const r = dailySnapshotSchema.safeParse({
      date: '2024-06-10',
      totalValue: 10000,
      totalCost: 8000,
      totalGain: 2000,
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative totalValue', () => {
    expect(dailySnapshotSchema.safeParse({ date: '2024-06-10', totalValue: -1 }).success).toBe(false);
  });

  it('defaults byIndustry to {}', () => {
    const r = dailySnapshotSchema.safeParse({ date: '2024-06-10', totalValue: 100 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.byIndustry).toEqual({});
  });
});

describe('analysisRequestSchema', () => {
  it('falls back to gemini for unknown provider', () => {
    const r = analysisRequestSchema.safeParse({ lang: 'en', provider: 'unknown-model' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.provider).toBe('gemini');
  });

  it('falls back to en for unknown lang', () => {
    const r = analysisRequestSchema.safeParse({ lang: 'fr', provider: 'gemini' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.lang).toBe('en');
  });

  it('accepts zh-TW lang', () => {
    const r = analysisRequestSchema.safeParse({ lang: 'zh-TW', provider: 'gemini' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.lang).toBe('zh-TW');
  });
});

describe('symbolsParamSchema', () => {
  it('splits comma-separated symbols', () => {
    const r = symbolsParamSchema.safeParse('AAPL,GOOG,MSFT');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual(['AAPL', 'GOOG', 'MSFT']);
  });

  it('strips whitespace around symbols', () => {
    const r = symbolsParamSchema.safeParse('AAPL, GOOG');
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toEqual(['AAPL', 'GOOG']);
  });

  it('rejects symbols with invalid characters', () => {
    expect(symbolsParamSchema.safeParse('<script>').success).toBe(false);
  });

  it('rejects more than 50 symbols', () => {
    const symbols = Array.from({ length: 51 }, (_, i) => `S${i}`).join(',');
    expect(symbolsParamSchema.safeParse(symbols).success).toBe(false);
  });
});

describe('historyParamsSchema', () => {
  it('accepts valid symbol and range', () => {
    const r = historyParamsSchema.safeParse({ symbol: 'AAPL', range: '1Y' });
    expect(r.success).toBe(true);
  });

  it('falls back to 1Y for unknown range', () => {
    const r = historyParamsSchema.safeParse({ symbol: 'AAPL', range: 'BOGUS' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.range).toBe('1Y');
  });

  it('accepts Today range', () => {
    const r = historyParamsSchema.safeParse({ symbol: 'AAPL', range: 'Today' });
    expect(r.success).toBe(true);
  });
});

describe('newsParamsSchema', () => {
  it('falls back to page 1 for non-numeric page', () => {
    const r = newsParamsSchema.safeParse({ page: 'abc' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.page).toBe(1);
  });

  it('coerces page string to number', () => {
    const r = newsParamsSchema.safeParse({ page: '3' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.page).toBe(3);
  });
});

describe('snapshotsQuerySchema', () => {
  it('defaults to 90 when days is missing', () => {
    const r = snapshotsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.days).toBe(90);
  });

  it('coerces string to number', () => {
    const r = snapshotsQuerySchema.safeParse({ days: '30' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.days).toBe(30);
  });

  it('rejects days > 3650', () => {
    const r = snapshotsQuerySchema.safeParse({ days: 9999 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.days).toBe(90);
  });
});

describe('searchQuerySchema', () => {
  it('accepts a valid query', () => {
    expect(searchQuerySchema.safeParse({ q: 'Apple' }).success).toBe(true);
  });

  it('rejects empty string', () => {
    expect(searchQuerySchema.safeParse({ q: '' }).success).toBe(false);
  });

  it('rejects query over 60 chars', () => {
    expect(searchQuerySchema.safeParse({ q: 'A'.repeat(61) }).success).toBe(false);
  });

  it('trims whitespace', () => {
    const r = searchQuerySchema.safeParse({ q: '  AAPL  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.q).toBe('AAPL');
  });
});

describe('macroContextSchema', () => {
  it('accepts text under the limit', () => {
    expect(macroContextSchema.safeParse({ text: 'Market context' }).success).toBe(true);
  });

  it('rejects text over 4000 chars', () => {
    expect(macroContextSchema.safeParse({ text: 'A'.repeat(4001) }).success).toBe(false);
  });
});
