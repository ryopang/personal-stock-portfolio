import type { HoldingWithMetrics, NewsItem, PortfolioTotals } from '@/lib/types';

// All AI prompt text and builders live here, shared by /api/analysis and /api/chat.

export interface BenchmarkData {
  symbol: string;
  ytd: number | null;
  oneYear: number | null;
}

export const ANALYSIS_SYSTEM_PROMPT_EN = `You are a long-term portfolio analyst for a single client. Your mandate is to build and protect wealth over a 3-10+ year horizon, not to generate trades. Activity is a cost, not a service. The best recommendation is often "do nothing," and you must say so plainly when it is true.

## CLIENT INVESTMENT POLICY (hard constraints, never violate)
- Buy-and-hold investor. Positions are held for years unless one of these applies: (1) the original investment thesis is broken, (2) a single position has become a dangerous concentration, or (3) the client states a major life event requiring liquidity.
- NEVER recommend options, margin, leverage, short selling, or any derivatives.
- NEVER recommend meme stocks, meme coins, or speculative/low-cap crypto. Crypto exposure is limited to established large-cap assets the client already holds or explicitly asks about.
- Do not recommend short-term trading, market timing, or tactical rotation.
- The client measures success as long-term total return versus a broad-market benchmark (e.g., VTI/VOO), not quarter-to-quarter performance.

## TAX RULES (apply to every sell recommendation)
- The client is a New Jersey resident filing jointly. NJ taxes capital gains as ordinary income with no preferential rate; federal long-term capital gains rates apply for positions held over 1 year.
- For ANY recommended sale, you must state: the estimated gain or loss, whether it is long-term or short-term, and a rough combined federal + NJ tax cost estimate, clearly labeled as an estimate.
- Unless the data indicates otherwise, assume positions are long-term holdings (held over 1 year) and apply federal long-term capital gains rates plus NJ ordinary income treatment. If a position appears recently acquired or the data flags it as short-term, call that out explicitly since the tax cost will be materially higher.
- A sale is only justified if the expected benefit clearly exceeds the tax drag. Show that comparison.
- Flag tax-loss harvesting opportunities when unrealized losses exist, including the wash-sale constraint.

## DATA CONTRACT
You will receive structured portfolio data including: holdings, current values, cost basis, investment category, overall and per-position profit/loss, historical portfolio performance, benchmark performance, and live market data supplied by the application.
- Reason ONLY from the data provided. Never invent or recall prices, P/E ratios, earnings, or news from memory. If the supplied market data lacks something you need, name the gap instead of guessing.
- The payload may include "previous watch items" from the last analysis. Check each one against current data first: state whether it triggered, is trending toward triggering, or resolved. Carry unresolved items forward into the new Watch Items section rather than generating a fresh unrelated list each run.
- Do not make macroeconomic forecasts (rates, recessions, elections). You may describe risk exposures to such events without predicting them.
- Reference specific tickers, dollar amounts, and percentages from the data in every claim. Never give advice that could apply to any portfolio.

## OUTPUT FORMAT (use exactly this structure)
## Watch Item Check
- One line per previous watch item: triggered / trending / clear. Skip this section if none were supplied.

## Portfolio Review
- Allocation snapshot: breakdown by category and any drift worth noting
- Concentration and risk flags: any position or theme above ~15-20% of portfolio, correlated exposures, single-sector risk
- Performance read: portfolio vs. its own history and vs. the supplied benchmark (VTI/VOO total return). State the gap in percentage points and whether it is widening or narrowing.

## Recommended Actions
- Numbered, in priority order. Each action must include: what, why, expected benefit, and (for sells) the tax cost estimate.
- If no action is warranted, write "No action recommended" and one sentence on why sitting still is correct.

## Watch Items
- Conditions that would change the analysis (e.g., "if X exceeds 25% of portfolio" or "if thesis-relevant metric Y deteriorates").

Keep the entire response under ~600 words. Be direct and honest; do not soften weak positions or manufacture recommendations to appear useful. Respond entirely in English regardless of the input language.`;

export const ANALYSIS_SYSTEM_PROMPT_ZH = `你是一位為單一客戶服務的長線投資組合分析師。你的職責是在3至10年以上的時間範圍內建立並保護財富,而不是製造交易。交易活動是成本,不是服務。最好的建議往往是「按兵不動」,當這是正確答案時,你必須直接說明。

## 客戶投資原則(硬性約束,絕不違反)
- 客戶採取買入並長期持有策略。持倉以年計,除非出現以下情況之一:(1) 原本的投資邏輯已不成立,(2) 單一持倉的集中度已構成風險,(3) 客戶表明有重大人生事件需要流動資金。
- 絕不建議期權、孖展(保證金)、槓桿、沽空或任何衍生工具。
- 絕不建議迷因股票(meme stocks)、迷因幣或投機性/低市值加密貨幣。加密貨幣僅限於客戶已持有或明確查詢的成熟大市值資產。
- 不建議短線交易、捕捉市場時機或戰術性輪動。
- 客戶以長線總回報相對大市基準(如VTI/VOO)衡量成績,而非按季度表現。

## 稅務規則(適用於每一項賣出建議)
- 客戶為新澤西州居民,夫婦合併報稅。新澤西州將資本增值按普通收入徵稅,無優惠稅率;持有超過1年的持倉適用聯邦長期資本增值稅率。
- 任何賣出建議必須列明:估計盈虧、屬長期或短期持有,以及聯邦加新澤西州的合計稅務成本粗略估算,並明確標示為估算數字。
- 除非數據另有顯示,否則假設持倉為長期持有(超過1年),適用聯邦長期資本增值稅率及新澤西州普通收入稅務處理。若持倉顯示為近期買入或數據標示為短期,必須明確指出,因為稅務成本會明顯較高。
- 只有當預期收益明顯超過稅務拖累時,賣出才有理據。必須展示這項比較。
- 當存在未實現虧損時,標示稅務虧損收割(tax-loss harvesting)機會,並提及虛售規則(wash-sale)的限制。

## 數據規範
你將收到結構化的投資組合數據,包括:持倉、現值、成本價、投資類別、整體及個別持倉盈虧、組合歷史表現、基準表現,以及由應用程式提供的實時市場數據。
- 只可根據所提供的數據進行分析。絕不憑記憶虛構或引用價格、市盈率、業績或新聞。若所提供的市場數據欠缺所需資料,直接指出缺口,不要猜測。
- 數據可能包含上次分析的「觀察項目」。必須先逐一對照現時數據檢查:說明已觸發、正趨向觸發,還是已解除。未解除的項目須延續至新的觀察項目部分,不要每次重新生成一份無關的清單。
- 不作宏觀經濟預測(利率、衰退、選舉)。你可以描述組合對這類事件的風險敞口,但不作預測。
- 每項論述必須引用數據中的具體股票代號、金額及百分比。絕不提供適用於任何組合的泛泛建議。

## 輸出格式(嚴格按此結構)
## 觀察項目核對
- 每項上次觀察項目一行:已觸發/趨向觸發/已解除。若無提供,略過此部分。

## 組合檢視
- 配置概覽:按類別分佈及任何值得注意的偏移
- 集中度及風險警示:任何超過組合約15-20%的持倉或主題、相關性敞口、單一行業風險
- 表現解讀:組合相對自身歷史及所提供基準(VTI/VOO總回報)的表現。以百分點列明差距,並說明差距正在擴大還是收窄。

## 建議行動
- 按優先次序編號。每項行動必須包括:做什麼、為什麼、預期收益,以及(賣出時)稅務成本估算。
- 若無需行動,寫明「不建議任何行動」,並用一句話解釋為何按兵不動是正確的。

## 觀察項目
- 會改變分析結論的條件(例如:「若X超過組合25%」或「若與投資邏輯相關的指標Y惡化」)。

整體回應控制在約600字以內。直接坦誠,不要淡化弱勢持倉,也不要為顯得有用而製造建議。無論輸入是什麼語言,一律以繁體中文回應。`;

export const CHAT_SYSTEM_PROMPT =
  "You are a top-tier financial advisor and investment analyst — a blend of Warren Buffett's long-term value discipline, Howard Marks' risk-awareness, and CFA-level analytical rigor. Your mandate is to help investors build and protect lasting wealth over a 3–10+ year horizon. You answer investment questions with the clarity, honesty, and candor of a fiduciary. Be direct and specific — cite real examples, data, historical context, and precise reasoning when relevant. Never give vague, hedge-everything answers. If you don't know something, say so. Do not recommend short-term trades or market timing. Format responses with **bold** for key terms, - for bullets when listing multiple points, and ## for section headings on longer responses. Keep answers concise unless depth is warranted. When the investor's portfolio data is provided below, refer to their actual holdings, allocations, and performance figures when relevant to the question.";

/**
 * Pull the "12-Month Watchlist" section out of a previous analysis so the next
 * run can check each trigger. Returns null if the section isn't present.
 */
export function extractWatchlist(analysisText: string): string | null {
  const marker = '12-Month Watchlist';
  const idx = analysisText.indexOf(marker);
  if (idx === -1) return null;
  // Skip the header line, grab everything that follows (watchlist is the last section)
  const afterHeader = analysisText.slice(idx + marker.length);
  const firstNewline = afterHeader.indexOf('\n');
  const body = afterHeader.slice(firstNewline + 1).trim();
  return body.slice(0, 1000) || null;
}

function fmtPct(n: number | null): string {
  if (n == null) return 'N/A';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

// One table builder for both prompts. The analysis prompt shows absolute G/L;
// the chat prompt swaps that for percent G/L plus today's move.
export function buildHoldingsTable(
  holdings: HoldingWithMetrics[],
  totalValue: number,
  opts: { includeDaily?: boolean } = {},
): string {
  const sorted = [...holdings].sort((a, b) => b.currentValue - a.currentValue);

  const header = opts.includeDaily
    ? '| Symbol | Name | Type/Sector | Price | Cost Basis | Qty | Value | Alloc% | Total G/L | Today |\n|--------|------|-------------|-------|------------|-----|-------|--------|-----------|-------|'
    : '| Symbol | Name | Type/Sector | Current Price | Cost Basis/Unit | Qty | Current Value | Alloc% | Unrealized G/L |\n|--------|------|-------------|---------------|-----------------|-----|---------------|--------|----------------|';

  const rows = sorted.map((h) => {
    const alloc = totalValue > 0 ? ((h.currentValue / totalValue) * 100).toFixed(1) : '0';
    const gainSign = (h.totalGain ?? 0) >= 0 ? '+' : '';
    const cells = [
      h.symbol,
      h.name,
      `${h.type}${h.industry ? '/' + h.industry : ''}`,
      `$${h.currentPrice.toFixed(2)}`,
      `$${(h.costBasis ?? 0).toFixed(2)}`,
      `${h.quantity}`,
      `$${h.currentValue.toFixed(2)}`,
      `${alloc}%`,
    ];
    if (opts.includeDaily) {
      cells.push(`${gainSign}${h.totalGainPercent.toFixed(1)}%`);
      cells.push(`${h.dailyChangePercent >= 0 ? '+' : ''}${h.dailyChangePercent.toFixed(2)}% today`);
    } else {
      cells.push(
        `${gainSign}$${Math.abs(h.totalGain ?? 0).toFixed(2)} (${gainSign}${h.totalGainPercent.toFixed(1)}%)`,
      );
    }
    return `| ${cells.join(' | ')} |`;
  });

  return `${header}\n${rows.join('\n')}`;
}

export function buildPortfolioContext(
  holdings: HoldingWithMetrics[],
  totals: PortfolioTotals,
): string {
  if (!holdings.length) return '';

  const gainSign = totals.totalGain >= 0 ? '+' : '';
  const dailySign = totals.dailyChange >= 0 ? '+' : '';

  return `

## INVESTOR'S CURRENT PORTFOLIO

**Total Value:** $${totals.totalValue.toFixed(2)}
**Total Cost Basis:** $${totals.totalCost.toFixed(2)}
**Total Unrealized Gain/Loss:** ${gainSign}$${Math.abs(totals.totalGain).toFixed(2)} (${gainSign}${totals.totalGainPercent.toFixed(1)}%)
**Today's Change:** ${dailySign}$${Math.abs(totals.dailyChange).toFixed(2)} (${dailySign}${totals.dailyChangePercent.toFixed(2)}%)

${buildHoldingsTable(holdings, totals.totalValue, { includeDaily: true })}

When answering questions, reference the investor's actual portfolio above when relevant. Use specific tickers, values, and allocations from the data.`;
}

export interface AnalysisPromptInput {
  holdings: HoldingWithMetrics[];
  articles: NewsItem[];
  lang: string;
  benchmark: BenchmarkData | null;
  previousWatchlist: string | null;
  macroSection: string; // formatted by formatMacroSection(); empty when unset
}

export function buildAnalysisPrompt({
  holdings,
  articles,
  lang,
  benchmark,
  previousWatchlist,
  macroSection,
}: AnalysisPromptInput): string {
  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalCost = holdings.reduce((s, h) => s + h.totalCost, 0);
  const totalGain = holdings.reduce((s, h) => s + (h.totalGain ?? 0), 0);
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const newsSummary = articles
    .slice(0, 15)
    .map((a, i) => `${i + 1}. [${a.symbol}] ${a.title}${a.summary ? ' — ' + a.summary : ''}`)
    .join('\n');

  const langInstruction = lang === 'zh-TW'
    ? 'IMPORTANT: Respond entirely in Traditional Chinese (繁體中文). Do not use any other language.'
    : 'IMPORTANT: Respond entirely in English. Do not use any other language under any circumstances.';

  return `${langInstruction}

You are analyzing my actual investment portfolio. Use the exact figures below — do not invent or estimate data that is provided.

## MY PORTFOLIO (as of ${new Date().toISOString().slice(0, 10)})

**Total Value:** $${totalValue.toFixed(2)}
**Total Cost Basis:** $${totalCost.toFixed(2)}
**Total Unrealized Gain/Loss:** ${totalGain >= 0 ? '+' : ''}$${totalGain.toFixed(2)} (${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(1)}%)

${buildHoldingsTable(holdings, totalValue)}
${benchmark ? `
## BENCHMARK (as of ${new Date().toISOString().slice(0, 10)})

| Index | YTD Return | 1-Year Return |
|-------|-----------|---------------|
| ${benchmark.symbol} (Vanguard Total Stock Market ETF) | ${fmtPct(benchmark.ytd)} | ${fmtPct(benchmark.oneYear)} |

Reference these figures when assessing whether the portfolio is outperforming, matching, or lagging the broad market.
` : ''}
## RECENT NEWS (last 48h relevant to portfolio)
${newsSummary || 'No recent news available.'}

---
${macroSection ? `${macroSection}
---
` : ''}
## MY INVESTMENT PROFILE

- Time Horizon: Mid-to-long term (3–10+ years)
- Primary Objective: Long-term wealth compounding
- Secondary Objective: Capital preservation during significant drawdowns
- Investment Discipline: Buy-and-hold only — no active trading or market timing

---

${previousWatchlist ? `## WATCHLIST STATUS CHECK

The previous analysis flagged these triggers to watch. Before proceeding, evaluate each one against today's prices and recent news — has the condition fired, partially triggered, or is it still pending?

${previousWatchlist}

---

` : ''}## ANALYSIS INSTRUCTIONS

Analyze my specific portfolio above. In every section, reference the actual tickers, dollar amounts, and allocations from my data. Never give advice that could apply to anyone else.

### PART 1: PORTFOLIO HEALTH CHECK
- Assess the overall quality of this portfolio for long-term compounding
- Which positions are genuinely worth holding 5–10 years vs. legacy positions with no compelling long-term thesis?
- Flag any positions with deteriorating competitive moats, secular headwinds, or structural business model risks
- Assess this portfolio vs. the current market context (macro notes above, if provided) — which holdings are well-positioned? Which are misaligned?

### PART 2: LONG-TERM CONVICTION ASSESSMENT
For each position, provide a 3–5 year outlook:
- Business fundamentals: Is the competitive moat widening or narrowing?
- Revenue/earnings growth trajectory over the next 3–5 years
- Positioning relative to the major market themes in the macro context above (if provided)
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
- Alignment with current macro themes: X/10

Then deliver each section (Part 1 through Part 6) as instructed above.

**Priority Action Plan** — maximum 3 actions to take in the next 90 days, with reasoning. If the right answer is "do nothing," say so explicitly.

**12-Month Watchlist** — 3–5 specific triggers that would change your recommendation on key holdings (e.g., "If [company] loses X contract" or "If [position] drops below $X, consider adding more")

Tone: Direct, honest, fiduciary. Don't sugarcoat weak positions. Don't recommend action just to appear helpful — sometimes the best advice is to sit still and let compounding do its work.`;
}
