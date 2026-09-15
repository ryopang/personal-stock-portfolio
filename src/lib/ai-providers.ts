import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, type LanguageModel } from 'ai';

export const PROVIDER_KEYS = ['gemini', 'claude-sonnet', 'claude-opus'] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

type ProviderOptions = Parameters<typeof streamText>[0]['providerOptions'];

interface ProviderConfig {
  label: string;
  envKey: string;
  keyHint: string;
  createModel: (apiKey: string) => LanguageModel;
  // Claude 5 only supports `thinking.type: 'adaptive'` — the API itself
  // rejects 'enabled' with a fixed budgetTokens, and 'disabled' has no real
  // effect (the SDK just omits the param, so the model's default reasoning
  // still runs). 'adaptive' + a low `effort` is the only lever, and it's a
  // soft one: for the full 6-part analysis prompt, combined reasoning+text
  // generation routinely exceeds Vercel Hobby's 60s function limit before
  // finishing. maxOutputTokens alone can't fix this — cutting it just cuts
  // the request off mid-answer instead of timing out. `wordLimit` (passed
  // into buildAnalysisPrompt) is what actually keeps requests fast, by
  // asking the model for a shorter answer instead of interrupting a long one.
  providerOptions?: ProviderOptions;
  maxOutputTokens?: number;
  wordLimit?: number;
}

const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  gemini: {
    label: 'Gemini 3.8 Flash',
    envKey: 'GEMINI_API_KEY',
    keyHint: 'Get a free key at aistudio.google.com',
    createModel: (apiKey) => createGoogleGenerativeAI({ apiKey })('gemini-3.8-flash'),
  },
  'claude-sonnet': {
    label: 'Claude Sonnet 5',
    envKey: 'ANTHROPIC_API_KEY',
    keyHint: 'Get an API key at console.anthropic.com',
    // baseURL is pinned rather than left to the SDK default because a stray
    // ANTHROPIC_BASE_URL env var (e.g. injected by Claude Code's own shell)
    // overrides it and drops the required /v1 path, 404-ing every request.
    createModel: (apiKey) => createAnthropic({ apiKey, baseURL: 'https://api.anthropic.com/v1' })('claude-sonnet-5'),
    providerOptions: { anthropic: { thinking: { type: 'adaptive' }, effort: 'low' } },
    maxOutputTokens: 6000,
    wordLimit: 1200,
  },
  'claude-opus': {
    label: 'Claude Opus 5',
    envKey: 'ANTHROPIC_API_KEY',
    keyHint: 'Get an API key at console.anthropic.com',
    createModel: (apiKey) => createAnthropic({ apiKey, baseURL: 'https://api.anthropic.com/v1' })('claude-opus-5'),
    providerOptions: { anthropic: { thinking: { type: 'adaptive' }, effort: 'low' } },
    // Opus reasons noticeably more per prompt than Sonnet at the same
    // effort level (measured: ~1.5-1.7x the thinking tokens), so it needs a
    // tighter word target to reliably finish inside the 60s window too.
    maxOutputTokens: 3800,
    wordLimit: 700,
  },
};

export type ResolvedProvider =
  | {
      ok: true;
      key: ProviderKey;
      label: string;
      model: LanguageModel;
      providerOptions?: ProviderOptions;
      maxOutputTokens?: number;
      wordLimit?: number;
    }
  | { ok: false; error: string };

// Unknown/missing keys fall back to Gemini rather than erroring, matching the
// previous behavior of both AI routes.
export function resolveProvider(requested: unknown): ResolvedProvider {
  const key: ProviderKey =
    typeof requested === 'string' && requested in PROVIDERS ? (requested as ProviderKey) : 'gemini';
  const config = PROVIDERS[key];
  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    return {
      ok: false,
      error: `${config.envKey} is not configured. ${config.keyHint} (no credit card required).`,
    };
  }
  return {
    ok: true,
    key,
    label: config.label,
    model: config.createModel(apiKey),
    providerOptions: config.providerOptions,
    maxOutputTokens: config.maxOutputTokens,
    wordLimit: config.wordLimit,
  };
}
