# Stock Performance Dashboard

A personal investment portfolio tracker built with Next.js. Track stocks, ETFs, and crypto in one place — with real-time quotes, performance charts, and AI-powered analysis.

---

## Features

### Holdings Management
- Add holdings via **symbol autocomplete search** — type a ticker and pick from live Yahoo Finance suggestions
- **Edit** any holding's quantity, cost basis, purchase date, industry label, or asset type
- **Delete** individual holdings with a single-click confirmation prompt
- **Clear all** holdings via the Admin menu — requires typing `DELETE` to confirm, preventing accidental wipes
- **Import holdings in bulk via CSV** — upload a file mapping symbol, quantity, cost basis, date, type, and industry
- **Import historical snapshots** — load past portfolio value data to backfill the trend chart without waiting for organic snapshots to accumulate

### Portfolio Overview
- **Live total portfolio value** with a directional arrow indicator (up/down) colored by today's performance
- **Summary metrics row**: today's daily change (dollar + percent), total amount invested, and total all-time gain/loss
- **Mover badges** in the Today column — click the green up-arrow badge to filter the table to gainers, the red down-arrow to filter to losers; click again to clear
- **Manual quote refresh** with a spinning indicator and optimistic UI; timestamp shows when prices were last fetched
- **Asset type tabs** (All / Stocks / ETFs / Crypto) — only tabs with holdings appear; each shows a unique symbol count badge
- **Industry filter chips** — one chip per industry detected in the current tab's holdings; click a chip to narrow the table to that sector; click again to clear
- **Column sorting** — click any table header (Investment, Price, Quantity, Avg Cost, Total Cost, Current Value, Daily Change, Total G/L, 52W Range) to sort ascending; click again to reverse
- **Alert filter** (👀 button in the Investment column header) — filters the table to only holdings with a daily move greater than 5%
- **Table totals footer** — live aggregate of Total Cost, Current Value, Daily Change, and Total G/L across the currently filtered view
- **52-week range bar** — visual indicator of where the current price sits within the 52-week high/low for each holding
- **Multi-lot grouping** — holdings sharing the same ticker collapse into a single aggregate row with combined totals; click to expand individual lots in place
- **Mobile card layout** — holdings render as stacked cards on small screens; grouped tickers show a full-detail summary card with lot count badge and expand to show each lot's card inline

### Charts

#### Industry Distribution Donut
- Visual pie/donut breakdown of portfolio by sector or industry label
- Hover a slice to see the industry name, allocation percentage, and current value in the center label
- Click a slice (or its row in the legend table) to **overlay that industry's cumulative gain/loss** on the Portfolio Trend chart
- Legend table shows cost, current value, daily change, and total G/L per industry; rows highlight on hover
- **Clear** button appears when an industry is selected

#### Portfolio Trend Line Chart
- Plots historical **portfolio value**, **total gain/loss**, or **total return %** — switchable via dropdown
- Time range pills: **1W, 1M, 3M, 6M, YTD**, per-calendar-year buttons (e.g. `24'`, `25'`), and **MAX**
- X-axis labels use calendar midpoints for clean, evenly-spaced date ticks regardless of partial periods
- Hover to see a crosshair + tooltip with the exact value for that date
- Period summary line above the chart shows start-to-end change for the selected range
- Industry overlay lines (dashed) appear automatically for all industries when none is selected; solid and primary when one is pinned
- Respects **privacy mode** — monetary values blur when privacy is enabled

#### Individual Stock Price Chart
- Per-symbol intraday and multi-year price history fetched from Yahoo Finance
- Symbol selector dropdown (deduplicated; sorted alphabetically)
- Time range pills: **Today, 1W, 1M, 3M, 6M, YTD, 1Y, 5Y, MAX**
- **Market Hours toggle** (Today view only) — filters to regular trading hours (9:30–16:00 ET); pre- and after-market sessions are shaded when the full day is shown
- Area fill gradient and colored price line (green if up, red if down from period open)
- Hover crosshair with a dot snapping to the nearest data point and a tooltip showing time, price, dollar change, and percent change
- Adaptive x-axis labels (time of day, weekday, week number, month, or year depending on range)

### Analysis Tab
- **Language toggle** — switch between English and Traditional Chinese (繁中); affects both AI analysis and the Investment Advisor chatbot
- **Market news** — broad market headlines fetched from Yahoo Finance
- **Portfolio news** — news filtered to your specific holdings; per-symbol pill filters to narrow by ticker
- **AI analysis** — LLM-generated portfolio commentary covering overall assessment, individual holding verdicts (BUY / HOLD / TRIM / EXIT, etc.), and risk notes
  - Provider selector: **Gemini 2.5 Flash** or **Groq (Llama 3.3 70B)**
  - Analysis is **persisted to Redis** and survives page reloads; a "Regenerate" button refreshes it on demand

### Investment Advisor Chatbot
- **Floating chat panel** — always-accessible button in the bottom-right corner; the page blurs behind the panel when it is open
- **Portfolio-aware context** — the LLM receives your full holdings, allocations, cost bases, and today's performance figures so answers are grounded in your actual situation
- **Multi-LLM** — switch between Gemini 2.5 Flash and Groq (Llama 3.3 70B) mid-session via the in-header dropdown
- **Streaming responses** with a stop button; a typing indicator appears while waiting for the first token
- **Suggested starter questions** — generic investing questions when the portfolio is empty; portfolio-specific prompts (concentration risk, drawdown analysis, trimming candidates) when holdings are loaded
- **Markdown rendering** — section headings, bullet lists, inline bold; tickers, percentages, and dollar amounts are syntax-highlighted in distinct colors
- **Multilingual** — responds in whichever language is set in the Analysis tab toggle

### UX Details
- **Dark mode by default** — new visitors start in dark mode; the toggle (sun/moon icon) persists the preference to `localStorage`
- **Global privacy mode** — eye icon in the header blurs all monetary values site-wide (useful for screen sharing); separate from the summary card's per-field toggle
- **Portfolio value toggle** — eye button on the summary card selectively hides sensitive figures (total value, invested, P&L amounts; today's daily change keeps the dollar amount but hides the percent); hidden by default on page load
- **Password gate** — lightweight client-side access control; session persists via `sessionStorage` so you don't re-enter on reload
- **Sticky header** — portfolio summary, view tabs, and type/industry filter bar all remain visible while scrolling
- **Optimistic mutations** — add, edit, and delete operations update the UI immediately and roll back if the server request fails
- **Responsive layout** — works on mobile and desktop; table switches to card layout, column padding and fonts tighten on small screens

---

## Changelog

### March 2026
- **Multi-lot holding groups** — holdings with the same ticker now collapse into a single aggregate row/card by default; click to expand and see individual lots underneath. The group row shows combined quantity, weighted-average cost basis, total value, daily change, total gain/loss, and 52W range. Sorting operates on the group aggregate so the table order is consistent.
- **Mobile group cards** — collapsed groups on mobile render as full-featured cards matching the single-holding card layout (value, daily change, avg cost, total gain/loss, 52W range) with a lot-count badge and chevron toggle; expanded lots appear inline at the same indentation level
- **Safari cross-browser fix** — eliminated `position: relative` on `<th>`/`<td>` elements (unsupported in Safari); mover icons (🔥/↓) and the 👀 filter button now use inline flex layout with a fixed-width icon slot instead of absolute positioning
- **Portfolio value toggle** — eye button on the summary card masks sensitive figures: total portfolio value, total invested, and total P&L show `••••••`; today's daily change keeps the dollar amount visible but hides the percentage; hidden by default on page load
- **UI polish — mobile & holdings table**
  - Price column moved between Investment and Quantity in the holdings table
  - Mobile holding cards now show the 👀 mover alert indicator; edit/delete touch targets enlarged to ~44px; `-USD` suffix stripped from crypto symbol display
  - Header icon buttons and view tabs enlarged for easier mobile tapping
  - Industry breakdown table hides Cost column on mobile and eliminates horizontal scroll via tighter padding and fonts
  - Industry breakdown rows show a unique symbol count badge
- **Deduplication fixes** — today's up/down mover counts, type tab counts, and industry chip counts now count each symbol only once (previously multi-lot holdings inflated the counts)
- **Chatbot backdrop blur** — the page blurs behind the Investment Advisor panel when it is open
- **SVG accessibility fix** — replaced invalid `title` prop with `aria-label` on SVG trend indicators in holding rows
- **Lint fixes**
  - `PasswordGate`: moved `sessionStorage` read into the `useState` lazy initializer, eliminating a `setState` call inside `useEffect`
  - `MarketNews`: removed stale `eslint-disable-next-line` directive that was no longer suppressing anything

### February 2026
- **Investment Advisor chatbot** — floating portfolio-aware chat panel with multi-LLM support (Gemini 2.5 Flash · Groq Llama 3.3 70B), streaming responses, markdown rendering, and suggested starter questions
- **AI analysis persistence** — LLM portfolio commentary is now persisted to Redis so it survives page reloads
- **Default dark mode** — new visitors start in dark mode; preference is saved to `localStorage`
- **Password gate** — lightweight client-side access control with session persistence via `sessionStorage`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Client state | Zustand v5 |
| Data fetching | SWR |
| Stock/crypto data | yahoo-finance2 |
| Persistence | Upstash Redis |
| AI analysis | Google Gemini 2.5 Flash · Groq Llama 3.3 70B |
| Deployment | Vercel |

---

## Design Decisions

**No external charting library** — all charts (donut, trend line, stock price) are hand-rolled SVG with React. This keeps the bundle lean and gives full control over interaction behavior and styling.

**Redis as the source of truth** — holdings and portfolio snapshots are stored server-side in Redis rather than in the browser. This means the portfolio is accessible from any device and survives browser cache clears. Zustand is used purely for in-memory UI state between renders.

**Manual refresh, not polling** — quotes are not auto-refreshed on a timer. The user explicitly triggers a refresh, which keeps Yahoo Finance API usage low and avoids stale-data surprises mid-session.

**Snapshots on demand** — each quote refresh writes a daily snapshot to Redis. This builds up a historical record over time that powers the trend chart, without requiring any scheduled jobs or background workers.

**Multi-provider AI with streaming** — both the AI analysis panel and the Investment Advisor chatbot route requests to either Google Gemini 2.5 Flash or Groq's Llama 3.3 70B, selectable per session. Responses stream token-by-token via the Fetch Streams API so the UI renders progressively. Choosing two free-tier-friendly providers means the AI features have no per-request cost under normal usage.

**Tailwind v4 with CSS design tokens** — the entire design system (colors, spacing, dark/light themes) is defined in `globals.css` using `@theme inline`. There is no `tailwind.config.js`.

**Optimistic mutations** — adding, editing, and deleting holdings update the UI immediately. If the server request fails, the UI rolls back to the last known good state from Redis.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analysis/      # AI analysis endpoint (Gemini / Groq)
│   │   ├── chat/          # Streaming Investment Advisor chatbot endpoint
│   │   ├── history/       # Per-symbol price history
│   │   ├── holdings/      # CRUD for portfolio holdings
│   │   ├── news/          # Market and portfolio news
│   │   ├── portfolio/     # Snapshot read/write
│   │   ├── quotes/        # Batch live price fetching
│   │   └── search/        # Symbol search (Yahoo Finance)
│   ├── page.tsx           # Server component — SSR initial holdings
│   └── layout.tsx
├── components/
│   ├── Dashboard.tsx      # Top-level client shell
│   ├── PortfolioSummary.tsx
│   ├── HoldingsSection.tsx / HoldingRow.tsx
│   ├── ChartsView.tsx     # All three charts
│   ├── AnalysisTab.tsx    # News + AI analysis layout
│   ├── AIAnalysis.tsx     # LLM analysis with verdict badges; Gemini / Groq selector
│   ├── InvestmentChatbot.tsx  # Floating portfolio-aware chatbot; Gemini / Groq selector
│   ├── MarketNews.tsx / PortfolioNews.tsx
│   ├── AddHoldingModal.tsx
│   ├── CSVImportModal.tsx
│   ├── HistoricalImportModal.tsx
│   └── SymbolSearch.tsx   # Autocomplete ticker search
├── hooks/
│   ├── usePortfolio.ts    # Composites holdings + live quotes → metrics
│   └── useQuotes.ts
├── lib/
│   ├── yahoo.ts           # Yahoo Finance singleton
│   ├── redis.ts           # Upstash Redis singleton
│   ├── holdings-service.ts
│   ├── crypto-symbols.ts  # BTC → BTC-USD symbol mapping
│   ├── calculations.ts
│   ├── formatters.ts
│   └── types.ts
└── store/
    └── portfolioStore.ts  # Zustand store
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Upstash Redis](https://upstash.com) database (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini) and/or a [Groq](https://console.groq.com) API key for AI features

### Environment Variables

Create a `.env.local` file in the project root:

```env
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
GEMINI_API_KEY=your_google_ai_studio_key    # for Gemini 2.5 Flash
GROQ_API_KEY=your_groq_api_key              # for Groq / Llama 3.3 70B
DASHBOARD_PASSWORD=your_optional_password   # omit to disable password gate
```

At least one of `GEMINI_API_KEY` or `GROQ_API_KEY` is required for AI analysis and the Investment Advisor chatbot. Both can be set to allow switching between providers in the UI.

### Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploying to Vercel

1. Push the repo to GitHub
2. Import into Vercel
3. Add the environment variables above in the Vercel project settings
4. Deploy

The Upstash Redis integration is available directly in the Vercel Storage dashboard if you prefer to provision it from there.
