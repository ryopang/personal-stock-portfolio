import { z } from 'zod';
import { PROVIDER_KEYS } from './ai-providers';
import { MACRO_CONTEXT_MAX_LENGTH } from './macro-context';

// Zod schemas for every API route's body and query params. Unknown providers
// and languages fall back to defaults (matching the routes' previous lenient
// behavior); malformed structural input gets a 400 via firstIssue().

/** Human-readable message for a 400 response from the first validation issue. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  const path = issue.path.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

export const assetTypeSchema = z.enum(['stock', 'etf', 'crypto']);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const langSchema = z.enum(['en', 'zh-TW']).catch('en').default('en');
const providerSchema = z.enum(PROVIDER_KEYS).catch('gemini').default('gemini');

// ---- Holdings ----

export const holdingCreateSchema = z.object({
  symbol: z.string().trim().min(1).max(12),
  type: assetTypeSchema,
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  costBasis: z.coerce.number().positive('Cost basis must be greater than 0'),
  purchaseDate: isoDateSchema,
  industry: z.string().trim().max(60).optional(),
});

export const holdingUpdateSchema = z.object({
  quantity: z.coerce.number().positive('Quantity must be greater than 0').optional(),
  costBasis: z.coerce.number().positive('Cost basis must be greater than 0').optional(),
  purchaseDate: isoDateSchema.optional(),
  type: assetTypeSchema.optional(),
  // Present-but-empty clears the industry; absent leaves it untouched
  industry: z.string().trim().max(60).optional(),
});

// ---- Snapshots ----

export const dailySnapshotSchema = z.object({
  date: isoDateSchema,
  timestamp: z.number().default(() => Date.now()),
  totalValue: z.number().positive('totalValue must be a positive number'),
  totalCost: z.number().nonnegative().default(0),
  totalGain: z.number().default(0),
  byIndustry: z
    .record(z.string(), z.object({ value: z.number(), totalGain: z.number() }))
    .default({}),
});

export const snapshotImportSchema = z.object({
  snapshots: z.array(z.unknown()).min(1, 'Expected non-empty snapshots array'),
});

// ---- AI routes ----

export const analysisRequestSchema = z.object({
  lang: langSchema,
  provider: providerSchema,
});

// Message parts are validated structurally here; convertToModelMessages does
// the deep per-part validation and throws on anything malformed.
export const chatRequestSchema = z.object({
  messages: z
    .array(
      z.looseObject({
        role: z.enum(['system', 'user', 'assistant']),
        parts: z.array(z.looseObject({})),
      }),
    )
    .min(1, 'No messages provided'),
  lang: langSchema,
  provider: providerSchema,
});

// ---- Macro context ----

export const macroContextSchema = z.object({
  text: z.string().max(
    MACRO_CONTEXT_MAX_LENGTH,
    `Macro context must be under ${MACRO_CONTEXT_MAX_LENGTH} characters`,
  ),
});

// ---- Query params ----

// Yahoo-format symbols: AAPL, BTC-USD, ^GSPC, GC=F, BRK.B
const symbolSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9.^=-]{1,15}$/, 'Invalid symbol');

export const symbolsParamSchema = z
  .string()
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
  .pipe(z.array(symbolSchema).min(1).max(50));

export const historyParamsSchema = z.object({
  symbol: symbolSchema,
  range: z
    .enum(['Today', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'MAX'])
    .catch('1Y')
    .default('1Y'),
  period1: isoDateSchema.nullish(),
});

export const newsParamsSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  // Google Translate target code, e.g. zh-TW
  translate: z.string().regex(/^[A-Za-z-]{2,10}$/).optional().catch(undefined),
  all: z.string().nullish(),
});

export const snapshotsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(3650).catch(90).default(90),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
});
