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
import { parsePortfolioParam, portfolioKey } from '@/lib/portfolios';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DEMO_ANALYSIS_TEXT } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';
// Without this, Vercel caps the function at its plan's default (10s on
// Hobby) — nowhere near enough for a full multi-part analysis, especially
// from a reasoning model that spends time thinking before the first token.
// 60s is the max allowed on Hobby; raise it if the account is on Pro/Enterprise.
export const maxDuration = 60;

interface CachedAnalysis {
  text: string;
  provider: string;
  generatedAt: number;
}

export async function GET(req: NextRequest) {
  if (DEMO_MODE) {
    return NextResponse.json({
      cached: {
        text: DEMO_ANALYSIS_TEXT,
        provider: 'demo',
        generatedAt: Date.now() - 60000, // pretend it was generated 1 minute ago
      } satisfies CachedAnalysis,
    });
  }
  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  const cached = await redis.get<CachedAnalysis>(portfolioKey(portfolio, 'analysis'));
  if (!cached) return NextResponse.json({ cached: null });
  return NextResponse.json({ cached });
}

export async function POST(req: NextRequest) {
  if (DEMO_MODE) {
    // Stream the demo analysis text as plain text — identical wire format to
    // what toTextStreamResponse() produces so AIAnalysis.tsx needs no changes.
    const encoder = new TextEncoder();
    const text = DEMO_ANALYSIS_TEXT;
    const stream = new ReadableStream({
      async start(controller) {
        // Stream in ~50-char chunks with a tiny delay to simulate AI streaming
        const chunkSize = 50;
        for (let i = 0; i < text.length; i += chunkSize) {
          controller.enqueue(encoder.encode(text.slice(i, i + chunkSize)));
          // Yield to the event loop so Next.js can flush chunks
          await new Promise((r) => setTimeout(r, 8));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  let lang: string = 'en';
  let providerKey: ProviderKey = 'gemini';

  try {
    ({ lang, provider: providerKey } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const portfolio = parsePortfolioParam(req.nextUrl.searchParams);
  if (!portfolio) return NextResponse.json({ error: 'Unknown portfolio' }, { status: 400 });
  const cacheKey = portfolioKey(portfolio, 'analysis');

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

  let holdings;
  try {
    ({ holdings } = await getPortfolioWithMetrics(portfolio));
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
    redis.get<CachedAnalysis>(cacheKey).catch(() => null),
  ]);

  const prompt = buildAnalysisPrompt({
    holdings,
    articles,
    lang,
    benchmark,
    previousWatchlist: cached?.text ? extractWatchlist(cached.text) : null,
    macroSection: formatMacroSection(macro),
    wordLimit: provider.wordLimit,
  });

  const result = streamText({
    model: provider.model,
    system: lang === 'zh-TW' ? ANALYSIS_SYSTEM_PROMPT_ZH : ANALYSIS_SYSTEM_PROMPT_EN,
    prompt,
    maxOutputTokens: provider.maxOutputTokens ?? 8192,
    providerOptions: provider.providerOptions,
    onError: ({ error }) => console.error('[POST /api/analysis]', error),
    onFinish: async ({ text }) => {
      if (text) {
        await redis.set(cacheKey, {
          text,
          provider: provider.key,
          generatedAt: Date.now(),
        } satisfies CachedAnalysis);
      }
    },
  });

  // toTextStreamResponse() would silently end with zero bytes if the model
  // call fails (e.g. auth/network error) — walk fullStream instead so a
  // failure is visible in the UI rather than rendering as a blank panel.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            controller.enqueue(encoder.encode(part.text));
          } else if (part.type === 'error') {
            const message = part.error instanceof Error ? part.error.message : String(part.error);
            controller.enqueue(encoder.encode(`\n\n⚠️ Analysis failed: ${message}`));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n\n⚠️ Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
