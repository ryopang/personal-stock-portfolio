import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { streamText } from 'ai';
import type { NewsItem } from '@/app/api/news/route';
import type { HoldingWithMetrics } from '@/lib/types';
import redis from '@/lib/redis';
import { resolveProvider, type ProviderKey } from '@/lib/ai-providers';
import { aiRatelimit, clientIp } from '@/lib/ratelimit';
import { getMacroContext, formatMacroSection } from '@/lib/macro-context';
import {
  ANALYSIS_SYSTEM_PROMPT_EN,
  ANALYSIS_SYSTEM_PROMPT_ZH,
  buildAnalysisPrompt,
  type BenchmarkData,
} from '@/lib/prompts';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'portfolio:analysis';

interface CachedAnalysis {
  text: string;
  provider: string;
  generatedAt: number;
}

export async function GET() {
  const cached = await redis.get<CachedAnalysis>(CACHE_KEY);
  if (!cached) return NextResponse.json({ cached: null });
  return NextResponse.json({ cached });
}

export async function POST(req: NextRequest) {
  let holdings: HoldingWithMetrics[];
  let articles: NewsItem[];
  let lang: string = 'en';
  let providerKey: ProviderKey = 'gemini';
  let benchmark: BenchmarkData | null = null;
  let previousWatchlist: string | null = null;

  try {
    ({ holdings, articles, lang, provider: providerKey, benchmark, previousWatchlist } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!holdings?.length) {
    return NextResponse.json({ error: 'No holdings provided.' }, { status: 400 });
  }

  const { success } = await aiRatelimit.limit(clientIp(req));
  if (!success) {
    return NextResponse.json(
      { error: 'Too many AI requests — try again in a little while.' },
      { status: 429 },
    );
  }

  const provider = resolveProvider(providerKey);
  if (!provider.ok) {
    return NextResponse.json({ error: provider.error }, { status: 500 });
  }

  const macro = await getMacroContext().catch(() => null);
  const prompt = buildAnalysisPrompt({
    holdings,
    articles: articles ?? [],
    lang,
    benchmark,
    previousWatchlist,
    macroSection: formatMacroSection(macro),
  });

  const result = streamText({
    model: provider.model,
    system: lang === 'zh-TW' ? ANALYSIS_SYSTEM_PROMPT_ZH : ANALYSIS_SYSTEM_PROMPT_EN,
    prompt,
    maxOutputTokens: 3000,
    onError: ({ error }) => console.error('[POST /api/analysis]', error),
    onFinish: async ({ text }) => {
      if (text) {
        await redis.set(CACHE_KEY, {
          text,
          provider: provider.key,
          generatedAt: Date.now(),
        } satisfies CachedAnalysis);
      }
    },
  });

  return result.toTextStreamResponse({ headers: { 'Cache-Control': 'no-store' } });
}
