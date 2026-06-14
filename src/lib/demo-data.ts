import type { Holding } from './types';

export const DEMO_PORTFOLIO_NAME = 'Demo Portfolio';

export const DEMO_HOLDINGS: Holding[] = [
  // AAPL — 3 lots
  {
    id: 'demo-aapl-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    industry: 'Technology',
    quantity: 15,
    costBasis: 142.50,
    purchaseDate: '2022-03-15',
    addedAt: '2022-03-15T09:30:00.000Z',
  },
  {
    id: 'demo-aapl-2',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    industry: 'Technology',
    quantity: 10,
    costBasis: 168.20,
    purchaseDate: '2023-01-10',
    addedAt: '2023-01-10T09:30:00.000Z',
  },
  {
    id: 'demo-aapl-3',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    industry: 'Technology',
    quantity: 8,
    costBasis: 182.40,
    purchaseDate: '2024-02-08',
    addedAt: '2024-02-08T09:30:00.000Z',
  },

  // MSFT — 2 lots
  {
    id: 'demo-msft-1',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    industry: 'Technology',
    quantity: 8,
    costBasis: 262.50,
    purchaseDate: '2022-06-20',
    addedAt: '2022-06-20T09:30:00.000Z',
  },
  {
    id: 'demo-msft-2',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    industry: 'Technology',
    quantity: 5,
    costBasis: 332.80,
    purchaseDate: '2023-09-14',
    addedAt: '2023-09-14T09:30:00.000Z',
  },

  // NVDA — 2 lots
  {
    id: 'demo-nvda-1',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    type: 'stock',
    industry: 'Semiconductors',
    quantity: 20,
    costBasis: 185.60,
    purchaseDate: '2023-02-28',
    addedAt: '2023-02-28T09:30:00.000Z',
  },
  {
    id: 'demo-nvda-2',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    type: 'stock',
    industry: 'Semiconductors',
    quantity: 10,
    costBasis: 450.20,
    purchaseDate: '2024-01-15',
    addedAt: '2024-01-15T09:30:00.000Z',
  },

  // AMZN — 1 lot
  {
    id: 'demo-amzn-1',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    type: 'stock',
    industry: 'Consumer Discretionary',
    quantity: 25,
    costBasis: 112.40,
    purchaseDate: '2023-05-10',
    addedAt: '2023-05-10T09:30:00.000Z',
  },

  // GOOGL — 1 lot
  {
    id: 'demo-googl-1',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'stock',
    industry: 'Technology',
    quantity: 30,
    costBasis: 128.90,
    purchaseDate: '2023-03-22',
    addedAt: '2023-03-22T09:30:00.000Z',
  },

  // JPM — 2 lots
  {
    id: 'demo-jpm-1',
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    type: 'stock',
    industry: 'Financials',
    quantity: 20,
    costBasis: 138.60,
    purchaseDate: '2022-09-12',
    addedAt: '2022-09-12T09:30:00.000Z',
  },
  {
    id: 'demo-jpm-2',
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    type: 'stock',
    industry: 'Financials',
    quantity: 15,
    costBasis: 165.40,
    purchaseDate: '2024-03-05',
    addedAt: '2024-03-05T09:30:00.000Z',
  },

  // VTI — 3 lots
  {
    id: 'demo-vti-1',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    type: 'etf',
    industry: 'Broad Market',
    quantity: 30,
    costBasis: 195.20,
    purchaseDate: '2021-11-30',
    addedAt: '2021-11-30T09:30:00.000Z',
  },
  {
    id: 'demo-vti-2',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    type: 'etf',
    industry: 'Broad Market',
    quantity: 25,
    costBasis: 180.40,
    purchaseDate: '2022-10-14',
    addedAt: '2022-10-14T09:30:00.000Z',
  },
  {
    id: 'demo-vti-3',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    type: 'etf',
    industry: 'Broad Market',
    quantity: 20,
    costBasis: 225.80,
    purchaseDate: '2024-01-20',
    addedAt: '2024-01-20T09:30:00.000Z',
  },

  // QQQ — 2 lots
  {
    id: 'demo-qqq-1',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    type: 'etf',
    industry: 'Technology',
    quantity: 15,
    costBasis: 282.40,
    purchaseDate: '2022-08-25',
    addedAt: '2022-08-25T09:30:00.000Z',
  },
  {
    id: 'demo-qqq-2',
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust',
    type: 'etf',
    industry: 'Technology',
    quantity: 12,
    costBasis: 358.90,
    purchaseDate: '2023-11-08',
    addedAt: '2023-11-08T09:30:00.000Z',
  },

  // BTC — 1 lot
  {
    id: 'demo-btc-1',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    industry: 'Crypto',
    quantity: 0.45,
    costBasis: 28400.00,
    purchaseDate: '2023-06-15',
    addedAt: '2023-06-15T09:30:00.000Z',
  },

  // ETH — 1 lot
  {
    id: 'demo-eth-1',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    industry: 'Crypto',
    quantity: 3.2,
    costBasis: 1820.00,
    purchaseDate: '2023-08-22',
    addedAt: '2023-08-22T09:30:00.000Z',
  },
];

export const DEMO_MACRO_CONTEXT =
  `Market conditions (June 2026): Inflation has cooled to 2.8% and the Fed has held rates steady at 4.25–4.50% for three consecutive meetings. AI infrastructure spending continues to drive tech sector outperformance. The labor market remains resilient with unemployment at 4.1%. Geopolitical risks in the Middle East and ongoing U.S.–China trade tensions create moderate macro uncertainty. Bitcoin is in its post-halving accumulation phase with institutional ETF demand structurally elevated.`;

export const DEMO_ANALYSIS_TEXT = `## 1. PORTFOLIO HEALTH CHECK

Your portfolio is in solid shape with a diversified mix of large-cap growth stocks, broad-market ETFs, and a modest crypto allocation. The core holdings span 6 industries and are anchored by businesses with durable competitive advantages.

**Strengths:**
- Core positions in AAPL, MSFT, and NVDA have compounded strongly over your holding periods
- VTI and QQQ provide systematic broad-market exposure with attractive cost bases
- JPM adds financial sector ballast with consistent dividend income and a fortress balance sheet

**Areas to watch:**
- Technology concentration (AAPL + MSFT + NVDA + GOOGL + QQQ) represents approximately 68% of portfolio value — elevated but defensible for a long-horizon investor
- BTC and ETH together sit at roughly 8% — appropriate sizing for speculative digital assets

---

## 2. CONVICTION ASSESSMENT

| Holding | Verdict | Rationale |
|---------|---------|-----------|
| AAPL | STRONG HOLD | Services revenue, hardware ecosystem lock-in, and AI integration make this a core compounder |
| MSFT | STRONG HOLD | Azure and Copilot enterprise adoption are compounding; one of the best AI infrastructure plays |
| NVDA | HOLD | Valuation is stretched after the AI-driven run-up; avoid adding at these levels |
| AMZN | BUY MORE | AWS re-acceleration and advertising growth remain underappreciated; long runway ahead |
| GOOGL | HOLD | Search moat intact but under pressure from AI assistants; Waymo is long-duration optionality |
| JPM | STRONG HOLD | Best-in-class balance sheet and disciplined capital allocation; hold through any rate cycle |
| VTI | STRONG HOLD | Core market exposure; add systematically on every dip |
| QQQ | HOLD | High overlap with individual tech holdings; no need to add more |
| BTC | HOLD | Post-halving setup is historically constructive; hold through volatility |
| ETH | MONITOR | Layer-2 competition intensifying; watch developer activity metrics before adding |

---

## 3. DIVERSIFICATION ANALYSIS

| Sector | Est. Allocation | Assessment |
|--------|-----------------|------------|
| Technology (AAPL, MSFT, GOOGL, QQQ) | ~46% | High but justified for a long-horizon growth portfolio |
| Semiconductors (NVDA) | ~14% | Concentrated single-name risk after large appreciation |
| Financials (JPM) | ~10% | Well-sized; good ballast in rate-sensitive environments |
| Broad Market (VTI) | ~15% | Core anchor; keep building |
| Consumer Discretionary (AMZN) | ~7% | Slightly underweight given strong fundamental outlook |
| Crypto (BTC + ETH) | ~8% | Appropriate sizing; do not increase beyond 10% |

Overall diversification: **Good.** The main single-name concentration risk is NVDA after its appreciation run. Consider sizing it no larger than 15% of portfolio going forward.

---

## 4. STRATEGIC ADDITIONS

If deploying new capital over the next 6 months, prioritize in this order:

- **AMZN** — Best risk/reward in the portfolio right now. AWS is re-accelerating, advertising is a hidden compounding machine, and margin expansion is still early innings
- **VTI** — Dollar-cost average into broad market on any pullback of 5%+. Lowest-risk long-term compounder in your book
- **JPM** — Financial sector is entering a sweet spot as rate normalization proceeds and dealmaking activity revives

Avoid adding to NVDA, QQQ, or GOOGL at current valuations until your existing positions digest their gains.

---

## 5. RISK MANAGEMENT

**Near-term risks to monitor:**

- NVDA: Any miss on data center revenue or guidance cut could trigger a sharp correction — this is your largest single-name risk given the elevated valuation
- BTC/ETH: Crypto volatility can be severe; ensure you are prepared to hold through a 40–60% drawdown without panic-selling
- Tech correlation: AAPL + MSFT + NVDA + GOOGL + QQQ will all sell off together in a tech rotation or broad risk-off event

**Tax status summary:**

All core positions (AAPL lots 1–2, MSFT lot 1, VTI lots 1–2, QQQ lot 1, NVDA lots 1–2, JPM lot 1) are long-term held and qualify for preferential capital gains rates. Your AAPL lot 3 (Feb 2024) is approaching the 1-year mark — avoid selling before the anniversary.

---

## 6. DO-NOTHING LIST

These positions require no action. Leave them alone:

- **VTI lot 1 (Nov 2021)** — Your oldest position. Let it compound. Do not touch
- **AAPL lot 1 (Mar 2022)** — Core holding with large embedded gains; hold indefinitely
- **MSFT lot 1 (Jun 2022)** — Foundational tech position; no reason to trim
- **JPM lot 1 (Sep 2022)** — Patient capital well-placed in the best-run bank in America
- **BTC (Jun 2023)** — Post-halving setup is constructive; do not panic-sell on volatility

---

## 12-Month Watchlist

| Ticker | Why Watching | Target Entry |
|--------|--------------|--------------|
| META | AI-driven ad platform renaissance; Reality Labs is long-duration optionality | Below $450 |
| BRK-B | Defensive compounder with a massive cash war chest ready to deploy | On broad market weakness |
| GLD | Geopolitical hedge and dollar diversification given elevated uncertainty | Any pullback from recent highs |
| PLTR | AI and data platform for enterprise; high growth but expensive; wait for a better entry | Below $50 |`;

export const DEMO_CHAT_RESPONSES = [
  `Looking at your portfolio, NVDA is your most concentrated single-name risk after its AI-driven appreciation. Your two lots sit at a blended cost basis well below current market prices — a strong gain on paper.

My read: the AI infrastructure thesis remains intact. Hyperscalers are not slowing data center spend, and NVIDIA's CUDA ecosystem moat is deeper than most people appreciate. But the stock is priced for perfection.

**What I'd recommend:** Don't sell. But resist the urge to add more at these levels. NVDA has grown to represent roughly 14% of the portfolio, which is at the upper bound of what I'd want in a single semiconductor name. Let it ride, but don't chase it higher.

The position is now long-term on both lots, so any future trim would be taxed at preferential capital gains rates. Keep that optionality in your back pocket. If NVDA corrects 25-30% without a fundamental thesis change, that would be the moment to consider adding.`,

  `Your portfolio carries meaningful technology concentration — when you add up AAPL, MSFT, NVDA, GOOGL, and QQQ, you're sitting at roughly 65-70% tech exposure depending on the day's prices.

That said, this is a concentrated portfolio by design, not by accident. You've deliberately chosen high-quality compounders in the dominant secular growth theme of our era. That's a defensible position for a long-term investor.

**The real diversification question isn't about sector labels** — it's about correlation. AAPL, MSFT, and NVDA will all sell off together in a broad tech rotation or risk-off event. VTI and JPM provide the best counterweight you currently have.

If I were advising a reduction in tech concentration, the cleanest move would be trimming QQQ rather than your individual names, since QQQ heavily overlaps with your direct stock holdings and adds less marginal value. But only act if your conviction has genuinely changed — not just to hit a round number.`,

  `Your crypto position — 0.45 BTC and 3.2 ETH — represents approximately 7-9% of the portfolio at current prices. That's a reasonable allocation for someone who believes in crypto's long-term role but isn't making it the centerpiece of their strategy.

**Bitcoin:** The post-halving setup is historically constructive. Supply issuance just dropped 50%, and institutional demand through spot ETFs has structurally changed the demand picture. Your cost basis of ~$28,400 gives you a solid cushion and patience to hold through volatility. I'd hold.

**Ethereum:** The picture is more nuanced. ETH faces real competition from Layer-2 chains and alternative L1s, and its "ultrasound money" narrative has cooled with lower validator yields. I'd watch developer activity data and on-chain transaction volume over the next two quarters before deciding whether to add more.

On sizing: I wouldn't increase crypto beyond 10% of total portfolio value. At current levels you're well-positioned to participate in upside while limiting downside if the space enters another extended bear cycle.`,

  `Dollar-cost averaging (DCA) is the practice of investing a fixed dollar amount on a regular schedule — monthly, bi-weekly, whatever fits your cash flow — regardless of market conditions.

**Why it works in practice:**
- It removes the psychological burden of trying to time the market, which almost no one does successfully
- You automatically buy more shares when prices are low and fewer when they're high — this is mechanical discipline
- It converts volatility from an enemy into an advantage over a long time horizon

For your portfolio specifically, DCA makes most sense with VTI. It's your core broad-market position, and adding to it systematically on any 5%+ dip is about as close to a free lunch as exists in public markets.

For individual names like AAPL or MSFT, DCA is fine but deserves slightly more attention to valuation. If MSFT runs 30% in two months, you don't need to mechanically add on a fixed schedule — wait for it to consolidate.

The most important rule: **never stop the DCA during a drawdown.** That's precisely when it's working hardest for you.`,

  `The decision to sell is the hardest part of investing because it forces a definitive judgment. Most investors sell at the wrong time — either too early, missing the big compounding gains, or too late, rationalizing a broken thesis.

Here's the framework I'd apply to your specific holdings:

**Sell when the thesis breaks, not when the price drops.**
If NVDA guides down because hyperscaler capex is genuinely decelerating — that's a thesis break worth acting on. NVDA down 20% because of macro fear or rotation is not — that's an opportunity to reassess, not panic-sell.

**Tax-aware selling:**
All your core positions are now long-term held, which is excellent. If you need to raise cash, selling these triggers federal LTCG rates (likely 15-20%) rather than short-term ordinary income rates. Run the math before executing any trade.

**The do-nothing default:**
For AAPL, MSFT, VTI, and JPM — the default answer is to do nothing and let them compound. These are businesses generating real cash flows with decades of runway. The biggest mistake most investors make is over-trading their best positions out of impatience.

Is there a specific position you're considering trimming? I can give you a more targeted view.`,

  `That's worth thinking through carefully. Let me give you my honest read based on your holdings and the current macro backdrop.

The market today is navigating a complex regime: inflation has retreated substantially from its 2022 peak but the Fed remains cautious about cutting prematurely. We're in a "higher for longer" interest rate environment, which has two key implications for your portfolio:

**Works in your favor:** JPM benefits directly. Banks earn more on net interest margin when rates stay elevated, and your position is well-sized for this environment.

**Risk to watch:** High-growth tech names carry more duration risk in their valuations — when discount rates stay elevated, it compresses the present value of distant future cash flows. This is why NVDA's valuation is the position I'd watch most carefully.

**Overall:** A well-constructed portfolio like yours is built to navigate this environment. You're not leveraged, you're not in speculative meme assets, and your core holdings generate real, growing earnings. The right move is to stay the course, keep building VTI systematically, and not let short-term macro noise push you into reactive trades you'd later regret.

What specific aspect of the current environment concerns you most?`,
];
