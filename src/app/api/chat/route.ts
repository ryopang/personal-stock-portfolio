import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { HoldingWithMetrics, PortfolioTotals } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BASE_SYSTEM_PROMPT =
  "You are a top-tier financial advisor and investment analyst — a blend of Warren Buffett's long-term value discipline, Howard Marks' risk-awareness, and CFA-level analytical rigor. Your mandate is to help investors build and protect lasting wealth over a 3–10+ year horizon. You answer investment questions with the clarity, honesty, and candor of a fiduciary. Be direct and specific — cite real examples, data, historical context, and precise reasoning when relevant. Never give vague, hedge-everything answers. If you don't know something, say so. Do not recommend short-term trades or market timing. Format responses with **bold** for key terms, - for bullets when listing multiple points, and ## for section headings on longer responses. Keep answers concise unless depth is warranted. When the investor's portfolio data is provided below, refer to their actual holdings, allocations, and performance figures when relevant to the question.";

const MACRO_CONTEXT = `
## MACRO CONTEXT (early 2026)
- S&P 500 has delivered three consecutive years of strong returns (~16% in 2025); valuations at historically elevated levels with near-zero equity risk premium
- Fed funds rate at 3.5–3.75%; markets expect modest further cuts (~50–75 bps) in 2026
- AI supercycle dominant theme — AI-exposed S&P 500 companies grew earnings ~30% annually 2023–2025 vs. 3% for non-AI companies
- Market leadership broadening: small/mid-caps, industrials, financials, Communication Services gaining ground
- International markets (Europe, Japan, EM) outperforming or catching up
- Key risks: historically thin equity risk premium, tariff policy uncertainty, mega-cap tech concentration, labor market softening`;

function buildPortfolioContext(holdings: HoldingWithMetrics[], totals: PortfolioTotals): string {
  if (!holdings.length) return '';

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);

  const holdingsTable = sorted.map((h) => {
    const alloc = totals.totalValue > 0 ? ((h.currentValue / totals.totalValue) * 100).toFixed(1) : '0';
    const gainSign = (h.totalGain ?? 0) >= 0 ? '+' : '';
    return `| ${h.symbol} | ${h.name} | ${h.type}${h.industry ? '/' + h.industry : ''} | $${h.currentPrice.toFixed(2)} | $${(h.costBasis ?? 0).toFixed(2)} | ${h.quantity} | $${h.currentValue.toFixed(2)} | ${alloc}% | ${gainSign}${h.totalGainPercent.toFixed(1)}% | ${h.dailyChangePercent >= 0 ? '+' : ''}${h.dailyChangePercent.toFixed(2)}% today |`;
  }).join('\n');

  const gainSign = totals.totalGain >= 0 ? '+' : '';
  const dailySign = totals.dailyChange >= 0 ? '+' : '';

  return `

## INVESTOR'S CURRENT PORTFOLIO

**Total Value:** $${totals.totalValue.toFixed(2)}
**Total Cost Basis:** $${totals.totalCost.toFixed(2)}
**Total Unrealized Gain/Loss:** ${gainSign}$${Math.abs(totals.totalGain).toFixed(2)} (${gainSign}${totals.totalGainPercent.toFixed(1)}%)
**Today's Change:** ${dailySign}$${Math.abs(totals.dailyChange).toFixed(2)} (${dailySign}${totals.dailyChangePercent.toFixed(2)}%)

| Symbol | Name | Type/Sector | Price | Cost Basis | Qty | Value | Alloc% | Total G/L | Today |
|--------|------|-------------|-------|------------|-----|-------|--------|-----------|-------|
${holdingsTable}

When answering questions, reference the investor's actual portfolio above when relevant. Use specific tickers, values, and allocations from the data.`;
}

const PROVIDERS = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    maxTokens: 4096,
    envKey: 'GEMINI_API_KEY',
    label: 'Gemini',
    keyHint: 'Get a free key at aistudio.google.com',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 4096,
    envKey: 'GROQ_API_KEY',
    label: 'Groq',
    keyHint: 'Get a free key at console.groq.com',
  },
} as const;

type ProviderKey = keyof typeof PROVIDERS;

export async function POST(req: NextRequest) {
  let messages: Message[];
  let providerKey: ProviderKey = 'gemini';
  let holdings: HoldingWithMetrics[] = [];
  let totals: PortfolioTotals | null = null;
  let lang: 'en' | 'zh-TW' = 'en';

  try {
    ({ messages, provider: providerKey, holdings, totals, lang } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!messages?.length) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const config = PROVIDERS[providerKey] ?? PROVIDERS.gemini;
  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    return NextResponse.json(
      { error: `${config.envKey} is not configured. ${config.keyHint} (no credit card required).` },
      { status: 500 },
    );
  }

  const portfolioContext = (holdings?.length && totals)
    ? buildPortfolioContext(holdings, totals)
    : '';

  const langInstruction = lang === 'zh-TW'
    ? '\n\nIMPORTANT: You must respond entirely in Traditional Chinese (繁體中文). Do not use any other language under any circumstances.'
    : '\n\nIMPORTANT: Respond entirely in English. Do not use any other language.';

  const systemPrompt = BASE_SYSTEM_PROMPT + MACRO_CONTEXT + portfolioContext + langInstruction;

  const apiRes = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!apiRes.ok) {
    const msg = await apiRes.text().catch(() => apiRes.statusText);
    return NextResponse.json({ error: `${config.label} API error: ${msg}` }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const reader = apiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const text = chunk.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // skip malformed chunk
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
