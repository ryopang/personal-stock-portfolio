import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NewsItem } from '@/app/api/news/route';
import type { HoldingWithMetrics } from '@/lib/types';
import redis from '@/lib/redis';

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

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT_EN =
  'You are a top-tier financial advisor and equity analyst — a blend of Warren Buffett\'s long-term value discipline, Howard Marks\' risk-awareness, and CFA-level analytical rigor. Your mandate is NOT to generate short-term trades. Your job is to build and protect lasting wealth over a 3–10+ year horizon. Approach this with the discipline of a fiduciary — every recommendation must serve the client\'s long-term financial interest, not generate activity. Be direct and honest — do not sugarcoat weak positions. Do not recommend action just to appear helpful. Sometimes the best advice is to sit still and let compounding do its work. Format: ## for major sections, **bold** for key points, - for bullets. Reference specific tickers, dollar amounts, and percentages from the data. Never give generic advice that could apply to anyone. IMPORTANT: Always respond entirely in English. Do not use any other language.';

const SYSTEM_PROMPT_ZH =
  '你是一位頂尖的財務顧問和股票分析師——融合了華倫·巴菲特的長期價值投資紀律、霍華德·馬克斯的風險意識，以及特許財務分析師（CFA）級別的分析嚴謹性。你的職責不是製造短線交易，而是在3–10年以上的長期視野中建立並保護持久財富。以受信義務人的紀律來對待每一個建議——每個推薦都必須符合客戶的長期財務利益，而非製造交易活動。直接、誠實，不美化弱勢倉位。有時最好的建議就是按兵不動，讓複利發揮作用。格式：## 作為主要段落標題，**粗體**標示重點，- 作為項目符號。引用具體的股票代號、金額和百分比。請以繁體中文回應。';


function buildPrompt(holdings: HoldingWithMetrics[], articles: NewsItem[], lang: string): string {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
  const totalGain = holdings.reduce((s, h) => s + (h.totalGain ?? 0), 0);
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);

  const holdingsTable = sorted.map((h) => {
    const alloc = totalValue > 0 ? ((h.currentValue / totalValue) * 100).toFixed(1) : '0';
    const gainSign = (h.totalGain ?? 0) >= 0 ? '+' : '';
    const unrealizedGain = h.totalGain ?? 0;
    const gainStr = `${gainSign}$${Math.abs(unrealizedGain).toFixed(2)} (${gainSign}${h.totalGainPercent.toFixed(1)}%)`;
    return `| ${h.symbol} | ${h.name} | ${h.type}${h.industry ? '/' + h.industry : ''} | $${h.currentPrice.toFixed(2)} | $${(h.costBasis ?? 0).toFixed(2)} | ${h.quantity} | $${h.currentValue.toFixed(2)} | ${alloc}% | ${gainStr} |`;
  }).join('\n');

  const newsSummary = articles
    .slice(0, 15)
    .map((a, i) => `${i + 1}. [${a.symbol}] ${a.title}${a.summary ? ' — ' + a.summary : ''}`)
    .join('\n');

  const langInstruction = lang === 'zh-TW'
    ? 'IMPORTANT: Respond entirely in Traditional Chinese (繁體中文). Do not use any other language.'
    : 'IMPORTANT: Respond entirely in English. Do not use any other language under any circumstances.';

  return `${langInstruction}

You are analyzing my actual investment portfolio. Use the exact figures below — do not invent or estimate data that is provided.

## MY PORTFOLIO (as of 2026-02-27)

**Total Value:** $${totalValue.toFixed(2)}
**Total Cost Basis:** $${totalCost.toFixed(2)}
**Total Unrealized Gain/Loss:** ${totalGain >= 0 ? '+' : ''}$${totalGain.toFixed(2)} (${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(1)}%)

| Symbol | Name | Type/Sector | Current Price | Cost Basis/Unit | Qty | Current Value | Alloc% | Unrealized G/L |
|--------|------|-------------|---------------|-----------------|-----|---------------|--------|----------------|
${holdingsTable}

## RECENT NEWS (last 48h relevant to portfolio)
${newsSummary || 'No recent news available.'}

---

## MACRO CONTEXT (early 2026)

**Macro Environment:**
- S&P 500 has delivered three consecutive years of strong returns (~16% in 2025); valuations at historically elevated levels with near-zero equity risk premium (~0.02%, among lowest on record)
- Fed funds rate at 3.5–3.75%; markets expect modest further cuts (~50–75 bps) in 2026
- Long-term GDP growth forecast ~1.9% real; inflation expectations ~2.4% (tariff uncertainty)
- AI supercycle dominant theme — AI-exposed S&P 500 companies grew earnings ~30% annually 2023–2025 vs. 3% for non-AI companies

**Key 2026 Trends:**
- Market leadership broadening: small/mid-caps, industrials, financials, Communication Services gaining ground
- International markets (Europe, Japan, EM) outperforming or catching up
- Real assets (REITs, infrastructure, commodities) gaining favor as equity risk premiums narrow
- Quality factor in favor: profitability, balance sheet strength, reasonable valuations
- AI infrastructure buildout still early-stage; data centers, power, semiconductor supply chains have long runways
- Goldman Sachs forecasts S&P 9–11% returns (with dividends) next 12 months; Oppenheimer targets S&P 8,100

**Key Risks:**
- Historically thin equity risk premium — vulnerable to any negative shock
- Tariff policy uncertainty could reignite inflation and compress margins
- Labor market softening — job gains stalling while capex surges
- Mega-cap tech concentration risk
- Credit stress rising in private credit; spillover risk to public markets

---

## MY INVESTMENT PROFILE

- Time Horizon: Mid-to-long term (3–10+ years)
- Primary Objective: Long-term wealth compounding
- Secondary Objective: Capital preservation during significant drawdowns
- Investment Discipline: Buy-and-hold only — no active trading or market timing

---

## ANALYSIS INSTRUCTIONS

Analyze my specific portfolio above. In every section, reference the actual tickers, dollar amounts, and allocations from my data. Never give advice that could apply to anyone else.

### PART 1: PORTFOLIO HEALTH CHECK
- Assess the overall quality of this portfolio for long-term compounding
- Which positions are genuinely worth holding 5–10 years vs. legacy positions with no compelling long-term thesis?
- Flag any positions with deteriorating competitive moats, secular headwinds, or structural business model risks
- Assess this portfolio vs. the 2026 market context — which holdings are well-positioned for the broadening bull market? Which are misaligned?

### PART 2: LONG-TERM CONVICTION ASSESSMENT
For each position, provide a 3–5 year outlook:
- Business fundamentals: Is the competitive moat widening or narrowing?
- Revenue/earnings growth trajectory over the next 3–5 years
- Positioning relative to major 2026 themes (AI, industrial broadening, real assets, international diversification)
- Rate each position: STRONG HOLD / HOLD / MONITOR / EXIT

### PART 3: PORTFOLIO CONSTRUCTION & DIVERSIFICATION
- Sector and geographic breakdown vs. S&P 500 weightings
- Identify dangerous concentration (any single position >10–15% of portfolio)
- Flag missing exposure: sectors or themes absent from this portfolio that matter for a 5–10 year horizon
- Assess correlation risk — positions that tend to fall together in a downturn
- Recommend target allocation adjustments

### PART 4: STRATEGIC ADDITIONS (New Capital Only)
Suggest 3–5 new positions or ETFs for NEW money only (no sales required):
- Complements this specific portfolio without adding redundancy
- Strong 5–10 year secular tailwinds
- Reasonable valuations relative to growth prospects
- For each, explain precisely which gap in this portfolio it fills

### PART 5: RISK MANAGEMENT (Long-Term Lens)
- What is the single biggest risk to this portfolio over a 5-year horizon?
- How would this portfolio perform in a prolonged bear market (30%+ drawdown)?
- Any positions facing potential permanent capital loss (existential disruption risk)?
- Structural hedges appropriate for this long-term portfolio

### PART 6: DO NOTHING LIST
List the positions I should simply leave alone — where patience and compounding is the correct action. For each, briefly state why holding is the right call given the long-term business outlook.

---

## OUTPUT FORMAT

**Executive Summary** (5 bullets max — the key takeaways)

**Portfolio Scorecard:**
- Long-term business quality: X/10
- Diversification: X/10
- Alignment with 2026–2030 macro themes: X/10

Then deliver each section (Part 1 through Part 6) as instructed above.

**Priority Action Plan** — maximum 3 actions to take in the next 90 days, with reasoning. If the right answer is "do nothing," say so explicitly.

**12-Month Watchlist** — 3–5 specific triggers that would change your recommendation on key holdings (e.g., "If [company] loses X contract" or "If [position] drops below $X, consider adding more")

Tone: Direct, honest, fiduciary. Don't sugarcoat weak positions. Don't recommend action just to appear helpful — sometimes the best advice is to sit still and let compounding do its work.`;
}

const PROVIDERS = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash',
    maxTokens: 16000,
    envKey: 'GEMINI_API_KEY',
    label: 'Gemini',
    keyHint: 'Get a free key at aistudio.google.com',
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 16000,
    envKey: 'GROQ_API_KEY',
    label: 'Groq',
    keyHint: 'Get a free key at console.groq.com',
  },
} as const;

type ProviderKey = keyof typeof PROVIDERS;

export async function POST(req: NextRequest) {
  let holdings: HoldingWithMetrics[];
  let articles: NewsItem[];
  let lang: string = 'en';
  let providerKey: ProviderKey = 'gemini';

  try {
    ({ holdings, articles, lang, provider: providerKey } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const config = PROVIDERS[providerKey] ?? PROVIDERS.gemini;
  const apiKey = process.env[config.envKey];
  if (!apiKey) {
    return NextResponse.json(
      { error: `${config.envKey} is not configured. ${config.keyHint} (no credit card required).` },
      { status: 500 },
    );
  }

  if (!holdings?.length) {
    return NextResponse.json({ error: 'No holdings provided.' }, { status: 400 });
  }

  const prompt = buildPrompt(holdings, articles ?? [], lang);
  const systemPrompt = lang === 'zh-TW' ? SYSTEM_PROMPT_ZH : SYSTEM_PROMPT_EN;

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
        { role: 'user', content: prompt },
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
      let fullText = '';

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
              if (text) {
                controller.enqueue(encoder.encode(text));
                fullText += text;
              }
            } catch {
              // skip malformed chunk
            }
          }
        }

        // Persist completed analysis to Redis
        if (fullText) {
          await redis.set(CACHE_KEY, { text: fullText, provider: providerKey, generatedAt: Date.now() });
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
