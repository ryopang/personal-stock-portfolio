import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import type { LanguageModel } from 'ai';

export const PROVIDER_KEYS = ['gemini', 'groq', 'claude-sonnet', 'claude-opus'] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

interface ProviderConfig {
  label: string;
  envKey: string;
  keyHint: string;
  createModel: (apiKey: string) => LanguageModel;
}

const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  gemini: {
    label: 'Gemini 2.5 Flash',
    envKey: 'GEMINI_API_KEY',
    keyHint: 'Get a free key at aistudio.google.com',
    createModel: (apiKey) => createGoogleGenerativeAI({ apiKey })('gemini-2.5-flash'),
  },
  groq: {
    label: 'Groq (Llama 3.3)',
    envKey: 'GROQ_API_KEY',
    keyHint: 'Get a free key at console.groq.com',
    createModel: (apiKey) => createGroq({ apiKey })('llama-3.3-70b-versatile'),
  },
  'claude-sonnet': {
    label: 'Claude Sonnet 4.6',
    envKey: 'ANTHROPIC_API_KEY',
    keyHint: 'Get an API key at console.anthropic.com',
    createModel: (apiKey) => createAnthropic({ apiKey })('claude-sonnet-4-6'),
  },
  'claude-opus': {
    label: 'Claude Opus 4.8',
    envKey: 'ANTHROPIC_API_KEY',
    keyHint: 'Get an API key at console.anthropic.com',
    createModel: (apiKey) => createAnthropic({ apiKey })('claude-opus-4-8'),
  },
};

export type ResolvedProvider =
  | { ok: true; key: ProviderKey; label: string; model: LanguageModel }
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
  return { ok: true, key, label: config.label, model: config.createModel(apiKey) };
}
