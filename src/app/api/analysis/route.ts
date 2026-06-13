import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { streamText } from 'ai';
import redis from '@/lib/redis';
import { resolveProvider, type ProviderKey } from '@/lib/ai-providers';
import { aiRatelimit, clientIp } from '@/lib/ratelimit';
import { getMacroContext, formatMacroSection } from '@/lib/macro-context';
import { getPortfolioWithMetrics, getBenchmarkReturns } from '@/lib/portfolio-server';
import { fetchNewsForSymbols } from '@/lib/news';
import { toYahooSymbol } from '@/lib/crypto-symbols';
import {
  ANALYSIS_SYSTEM_PROMPT_EN,
  ANALYSIS_SYSTEM_PROMPT_ZH,
  buildAnalysisPrompt,
  extractWatchlist,
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
  let lang: string = 'en';
  let providerKey: ProviderKey = 'gemini';

  try {
    ({ lang, provider: providerKey } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
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

  // All portfolio/market data is assembled server-side from Redis and Yahoo —
  // the client only chooses language and provider.
  let holdings;
  try {
    ({ holdings } = await getPortfolioWithMetrics());
  } catch (err) {
    console.error('[POST /api/analysis] portfolio fetch failed', err);
    return NextResponse.json({ error: 'Failed to load portfolio data.' }, { status: 502 });
  }
  if (!holdings.length) {
    return NextResponse.json({ error: 'No holdings in the portfolio.' }, { status: 400 });
  }

  const symbols = [...new Set(holdings.map((h) => toYahooSymbol(h.symbol, h.type)))];
  const [articles, benchmark, macro, cached] = await Promise.all([
    fetchNewsForSymbols(symbols).catch(() => []),
    getBenchmarkReturns('VTI'),
    getMacroContext().catch(() => null),
    redis.get<CachedAnalysis>(CACHE_KEY).catch(() => null),
  ]);

  const prompt = buildAnalysisPrompt({
    holdings,
    articles,
    lang,
    benchmark,
    previousWatchlist: cached?.text ? extractWatchlist(cached.text) : null,
    macroSection: formatMacroSection(macro),
  });

  const result = streamText({
    model: provider.model,
    system: lang === 'zh-TW' ? ANALYSIS_SYSTEM_PROMPT_ZH : ANALYSIS_SYSTEM_PROMPT_EN,
    prompt,
    maxOutputTokens: 4000,
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
