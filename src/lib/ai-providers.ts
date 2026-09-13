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
  // Claude 5 models default to adaptive extended thinking, and for a long,
  // instruction-heavy prompt (like the full portfolio analysis) that budget
  // can consume the entire output token limit before any visible text is
  // produced — "thinking: disabled" doesn't reliably override this for
  // complex prompts, so effort is capped instead to bound (not eliminate)
  // reasoning and guarantee room for the actual answer.
  providerOptions?: ProviderOptions;
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
  },
  'claude-opus': {
    label: 'Claude Opus 5',
    envKey: 'ANTHROPIC_API_KEY',
    keyHint: 'Get an API key at console.anthropic.com',
    createModel: (apiKey) => createAnthropic({ apiKey, baseURL: 'https://api.anthropic.com/v1' })('claude-opus-5'),
    providerOptions: { anthropic: { thinking: { type: 'adaptive' }, effort: 'low' } },
  },
};

export type ResolvedProvider =
  | {
      ok: true;
      key: ProviderKey;
      label: string;
      model: LanguageModel;
      providerOptions?: ProviderOptions;
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
  };
}
