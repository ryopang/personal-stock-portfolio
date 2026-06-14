# Stock Performance Dashboard

A personal investment portfolio tracker built with Next.js. Track stocks, ETFs, and crypto in one place — with real-time quotes, performance charts, AI-powered analysis, and a portfolio-aware investment advisor chatbot.

---

## Features

### Holdings Management
- Add holdings via **symbol autocomplete search** — type a ticker and pick from live Yahoo Finance suggestions
- **Edit** any holding's quantity, cost basis, purchase date, industry label, or asset type
- **Delete** individual holdings with a confirmation prompt
- **Clear all** holdings via the Admin menu — requires typing `DELETE` to confirm, preventing accidental wipes
- **Import holdings in bulk via CSV** — upload a file mapping symbol, quantity, cost basis, date, type, and industry
- **Import historical snapshots** — load past portfolio value data to backfill the trend chart without waiting for organic snapshots to accumulate
- **Bulk edit purchase dates** — Admin modal to update purchase dates across multiple lots at once

### Portfolio Overview
- **Live total portfolio value** with a directional arrow indicator (up/down) colored by today's performance
- **Summary metrics row**: today's daily change (dollar + percent), total amount invested, and total all-time gain/loss; the daily gain/loss card has a colored left-border accent (green/red) for at-a-glance direction
- **👀 Movers button** in the portfolio summary card — click to filter the table to holdings with a daily move greater than 5%; click again to clear
- **Manual quote refresh** with a spinning indicator and optimistic UI; timestamp shows when prices were last fetched
- **Asset type tabs** (All / Stocks / ETFs / Crypto) — only tabs with holdings appear; each shows a unique symbol count badge
- **Industry filter chips** — one chip per industry detected in the current tab's holdings; click a chip to narrow the table to that sector; click again to clear
- **Column sorting** — click any table header (Investment, Price, Quantity, Avg Cost, Total Cost, Current Value, Daily Change, Total G/L, 52W Range) to sort ascending; click again to reverse
- **Table totals footer** — live aggregate of Total Cost, Current Value, Daily Change, and Total G/L across the currently filtered view
- **52-week range bar** — visual indicator of where the current price sits within the 52-week high/low for each holding
- **Multi-lot grouping** — holdings sharing the same ticker collapse into a single aggregate row with combined totals; click to expand individual lots in place, sorted by purchase date ascending
- **Purchase date in expanded lots** — each lot row shows its purchase date alongside the lot-specific cost basis and quantity; child rows are visually indented
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
- **AI analysis** — LLM-generated portfolio commentary by a structured long-term analyst persona covering:
  - Portfolio health check and position quality
  - Per-position conviction ratings (STRONG HOLD / HOLD / MONITOR / EXIT)
  - Portfolio construction and diversification assessment
  - Strategic addition suggestions for new capital
  - Risk management (5-year horizon)
  - Do-nothing list (positions to hold patiently)
  - Watch items that carry forward between runs
  - Benchmark comparison against VTI/VOO (YTD and 1-year)
  - **Tax implication analysis** — each lot's purchase date and ST/LT classification (short-term ≤1 year, long-term >1 year) is included in the prompt; the AI applies NJ + federal tax rules to every sell recommendation
- **Provider selector** — choose from **Gemini 2.5 Flash**, **Groq (Llama 3.3 70B)**, **Claude Sonnet 4.6**, or **Claude Opus 4.8** per session
- Analysis is **persisted to Redis** and survives page reloads; a "Regenerate" button refreshes it on demand
- **AI rate limiting** — 20 requests per hour per IP to protect against token abuse

### Investment Advisor Chatbot
- **Floating chat panel** — always-accessible button in the bottom-right corner; the page blurs behind the panel when it is open
- **Portfolio-aware context** — the LLM receives your full holdings, allocations, cost bases, and today's performance figures so answers are grounded in your actual situation
- **Multi-LLM** — switch between Gemini 2.5 Flash, Groq (Llama 3.3), Claude Sonnet 4.6, and Claude Opus 4.8 mid-session via the in-header dropdown
- **Streaming responses** with a stop button; a typing indicator appears while waiting for the first token
- **Suggested starter questions** — generic investing questions when the portfolio is empty; portfolio-specific prompts (concentration risk, drawdown analysis, trimming candidates) when holdings are loaded
- **Markdown rendering** — section headings, bullet lists, inline bold; tickers, percentages, and dollar amounts are syntax-highlighted in distinct colors
- **Multilingual** — responds in whichever language is set in the Analysis tab toggle
- **Rate limited** — shares the 20 req/hour per-IP limit with the analysis endpoint

### Admin
- **Macro context editor** — write free-form market commentary (e.g., current rate environment, sector outlook) that is stored in Redis and automatically injected into every AI analysis prompt; keeps AI context current without changing code
- **Rename portfolio** — edit the portfolio display name shown in the header; saved to Redis and reflected immediately without a page reload
- **Password gate toggle** — enable or disable the client-side password gate from the Admin menu without redeploying
- **Bulk edit purchase dates** — update purchase dates across multiple lots in a single modal
- **Import** — unified entry that routes to CSV holdings import or historical snapshot import via a picker modal
- **Clear all holdings** — destructive wipe protected by a typed confirmation

### UX Details
- **Dark mode by default** — new visitors start in dark mode; the toggle (sun/moon icon) persists the preference to `localStorage`
- **Global privacy mode** — eye icon in the header blurs all monetary values site-wide (useful for screen sharing); separate from the summary card's per-field toggle
- **Portfolio value toggle** — eye button on the summary card selectively hides sensitive figures (total value, invested, P&L amounts; today's daily change keeps the dollar amount but hides the percent); hidden by default on page load
- **Password gate** — lightweight client-side access control; session persists via `sessionStorage` so you don't re-enter on reload
- **Toast notifications** — success and error feedback for add, edit, delete, and import operations
- **Accessible modals** — Escape key closes any open modal; focus-visible rings on all interactive elements; ARIA labels on icon buttons and SVG indicators
- **Sticky header** — portfolio summary, view tabs, and type/industry filter bar all remain visible while scrolling
- **Optimistic mutations** — add, edit, and delete operations update the UI immediately and roll back if the server request fails
- **Responsive layout** — works on mobile and desktop; table switches to card layout, column padding and fonts tighten on small screens

---

## Changelog

### June 2026 (latest)
- **AI analysis no longer cuts off** — removed the `maxOutputTokens: 4000` hard cap from `streamText`; the model now runs to its natural stopping point. Also fixed a `TextDecoder` flush bug that could silently drop the last bytes of a streaming response (most visible in Traditional Chinese output)
- **Markdown tables rendered as real tables** — `|`-delimited tables in AI analysis now render as proper HTML tables with a header row, alternating row backgrounds, and padding instead of raw pipe characters
- **AI analysis `---` dividers** — section separators now render as a single dotted line with 30 px spacing above and below instead of appearing as raw dashes
- **`#` heading support in AI analysis** — single-hash headings (e.g. `# 投資組合分析報告`) are now rendered as styled text instead of showing the literal `#`
- **Portfolio summary initial state** — on page load the daily gain/loss **dollar amount** is now visible while the total portfolio value and percentage remain hidden; clicking the eye icon reveals everything as before
- **Rename portfolio** — new Admin → "Rename portfolio" modal saves the portfolio name to Redis (`portfolio:name`) and updates the header immediately without a page reload
- **Merged import menu items** — "Import CSV" and "Import history" collapsed into a single "Import" entry that opens a picker letting you choose between Holdings (positions CSV) and Historical snapshots (trend chart backfill)
- **AI analysis table styling fixes** — tables now use theme-aware tokens (`bg-surface-secondary`, `border-border`) so they render correctly in both light and dark mode; column widths use `w-full` with `whitespace-nowrap` on the first column only, preventing horizontal scroll on narrow two-column tables (e.g. the "Do Nothing List") while keeping ticker names on one line

### June 2026
- **Per-lot tax classification in AI analysis** — each holding row in the AI prompt now includes the lot's exact purchase date and a `ST` (short-term, ≤1 year) or `LT` (long-term, >1 year) classification computed from today's date. Both English and Chinese system prompts updated to require the AI to use actual lot data instead of assuming all positions are long-term. This enables accurate NJ + federal tax cost estimates for any recommended sale.
- **Purchase date in expanded lot rows** — clicking a multi-lot group now reveals each lot's purchase date alongside its cost basis and quantity; child rows are indented and sorted by purchase date ascending
- **Bulk edit purchase dates modal** — Admin panel shortcut to update purchase dates across multiple lots at once
- **Purchase date field in add/edit modal** — cross-platform native date input with correct UTC/local handling
- **Colored left-border accent on summary cards** — the daily gain/loss card shows a green or red left border for at-a-glance direction
- **👀 Movers button moved to portfolio summary card** — the filter button is now inline with the summary metrics for easier discovery
- **Four AI providers** — added Claude Sonnet 4.6 and Claude Opus 4.8 alongside Gemini 2.5 Flash and Groq Llama 3.3 70B; all four available in both the analysis panel and the chatbot
- **Vercel AI SDK migration** — analysis and chat routes now use `streamText` + `toUIMessageStreamResponse` via the Vercel AI SDK; all four providers share a unified `ai-providers.ts` registry
- **AI routes assemble portfolio data server-side** — the analysis and chat API routes now fetch and compose holdings + quotes on the server, reducing client payload size
- **Structured analyst persona prompts** — both English and Chinese prompts rewritten with explicit buy-and-hold investment policy, NJ tax rules, and a six-part analysis structure (health check, conviction, construction, additions, risk, do-nothing list)
- **Benchmark comparison** — VTI/VOO YTD and 1-year return fetched and included in the AI analysis prompt
- **Watchlist carry-forward** — the previous analysis's "12-Month Watchlist" is extracted from Redis and passed to the next run so the AI evaluates prior triggers rather than generating a fresh unrelated list
- **Redis-backed macro context** — free-form market commentary edited in Admin is stored in Redis and injected into every AI analysis prompt; keeps context fresh without code changes
- **AI rate limiting** — 20 requests/hour per IP via `@upstash/ratelimit` (sliding window) on both `/api/analysis` and `/api/chat`
- **Password gate toggle** — enable/disable the client-side password gate from Admin without redeploying
- **Toast notifications** — success/error toasts for add, edit, delete, and import operations
- **Accessible modals** — Escape key, focus-visible rings, and ARIA labels added across all modals and interactive elements
- **Bug fixes** — date overflow, UTC/local mismatch on date inputs, falsy guard on zero-value holdings, uncontrolled input warnings

### March 2026
- **Stock price chart daily change fix** — the "Today" chart now uses the previous trading day's official close as its baseline (sourced from `chartPreviousClose` in Yahoo Finance chart metadata), so the displayed gain/loss and line color always match the Daily Change column in the holdings table
- **Multi-lot holding groups** — holdings with the same ticker collapse into a single aggregate row/card by default; click to expand and see individual lots underneath. The group row shows combined quantity, weighted-average cost basis, total value, daily change, total gain/loss, and 52W range. Sorting operates on the group aggregate
- **Mobile group cards** — collapsed groups on mobile render as full-featured summary cards with a lot-count badge and chevron toggle; expanded lots appear inline at the same indentation level
- **Safari cross-browser fix** — eliminated `position: relative` on `<th>`/`<td>` elements (unsupported in Safari); mover icons and the 👀 filter button now use inline flex layout with a fixed-width icon slot
- **Portfolio value toggle** — eye button on the summary card masks sensitive figures; hidden by default on page load
- **UI polish** — price column repositioned; mobile card touch targets enlarged; `-USD` suffix stripped from crypto symbol display; industry breakdown hides Cost column on mobile; industry rows show unique symbol count badge
- **Deduplication fixes** — mover counts, type tab counts, and industry chip counts now count each symbol only once across multi-lot holdings
- **Chatbot backdrop blur** — page blurs behind the Investment Advisor panel when open

### February 2026
- **Investment Advisor chatbot** — floating portfolio-aware chat panel with multi-LLM support, streaming responses, markdown rendering, and suggested starter questions
- **AI analysis persistence** — LLM portfolio commentary persisted to Redis; survives page reloads
- **Default dark mode** — new visitors start in dark mode; preference saved to `localStorage`
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
| AI (streaming) | Vercel AI SDK (`ai` + `@ai-sdk/*`) |
| AI providers | Gemini 2.5 Flash · Groq Llama 3.3 70B · Claude Sonnet 4.6 · Claude Opus 4.8 |
| Rate limiting | @upstash/ratelimit |
| Deployment | Vercel |

---

## Design Decisions

**No external charting library** — all charts (donut, trend line, stock price) are hand-rolled SVG with React. This keeps the bundle lean and gives full control over interaction behavior and styling.

**Redis as the source of truth** — holdings, portfolio snapshots, AI analysis results, and macro context are stored server-side in Redis. The portfolio is accessible from any device and survives browser cache clears. Zustand is used purely for in-memory UI state between renders.

**Manual refresh, not polling** — quotes are not auto-refreshed on a timer. The user explicitly triggers a refresh, which keeps Yahoo Finance API usage low and avoids stale-data surprises mid-session.

**Snapshots on demand** — each quote refresh writes a daily snapshot to Redis. This builds up a historical record over time that powers the trend chart, without requiring any scheduled jobs or background workers.

**Four AI providers behind a unified SDK** — all four providers (Gemini, Groq, Claude Sonnet, Claude Opus) are registered in `src/lib/ai-providers.ts` and accessed through the Vercel AI SDK's `streamText`. Adding a new provider is a one-entry change to the registry. Responses stream token-by-token so the UI renders progressively.

**Structured analyst persona, not a generic prompt** — both the English and Chinese system prompts encode a specific investment policy (buy-and-hold, NJ tax rules, no derivatives) and a six-part output structure. This produces consistent, actionable analysis rather than generic commentary. Per-lot purchase dates and ST/LT classification are injected into every prompt so tax cost estimates are based on actual hold times.

**Macro context is user-maintained data** — market commentary injected into AI prompts lives in Redis and is editable via Admin. It is never hardcoded in prompt text, so it doesn't go stale between deploys.

**AI rate limiting as the hard backstop** — the password gate is client-side only (key is baked into the bundle), so `@upstash/ratelimit` on the AI routes is the real protection against token abuse. 20 requests/hour per IP is sufficient for personal use.

**Tailwind v4 with CSS design tokens** — the entire design system (colors, spacing, dark/light themes) is defined in `globals.css` using `@theme inline`. There is no `tailwind.config.js`.

**Optimistic mutations** — adding, editing, and deleting holdings update the UI immediately. If the server request fails, the UI rolls back to the last known good state from Redis.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analysis/      # AI analysis endpoint (streaming, rate-limited)
│   │   ├── chat/          # Streaming Investment Advisor chatbot endpoint
│   │   ├── history/       # Per-symbol price history
│   │   ├── holdings/      # CRUD for portfolio holdings
│   │   ├── macro-context/ # Admin read/write for market commentary
│   │   ├── portfolio-name/ # Admin read/write for portfolio display name
│   │   ├── news/          # Market and portfolio news
│   │   ├── portfolio/     # Snapshot read/write
│   │   ├── quotes/        # Batch live price fetching
│   │   └── search/        # Symbol search (Yahoo Finance)
│   ├── page.tsx           # Server component — SSR initial holdings
│   └── layout.tsx
├── components/
│   ├── Dashboard.tsx          # Top-level client shell
│   ├── PortfolioSummary.tsx
│   ├── HoldingsSection.tsx    # Holdings table + mobile cards; grouping, sorting, filtering
│   ├── HoldingRow.tsx         # HoldingTableRow, GroupSummaryTableRow, GroupCard, HoldingCard
│   ├── ChartsView.tsx         # All three SVG charts
│   ├── AnalysisTab.tsx        # News + AI analysis layout
│   ├── AIAnalysis.tsx         # LLM analysis panel; provider selector
│   ├── InvestmentChatbot.tsx  # Floating portfolio-aware chatbot; provider selector
│   ├── MacroContextModal.tsx  # Admin editor for Redis-backed macro commentary
│   ├── ImportPickerModal.tsx  # Picker modal routing to CSV or historical import
│   ├── EditPurchaseDatesModal.tsx  # Bulk purchase date editor
│   ├── ConfirmModal.tsx       # Reusable typed-confirmation dialog
│   ├── Toasts.tsx             # Global toast notification system
│   ├── MarketNews.tsx / PortfolioNews.tsx
│   ├── AddHoldingModal.tsx
│   ├── CSVImportModal.tsx
│   ├── HistoricalImportModal.tsx
│   ├── PasswordGate.tsx
│   └── SymbolSearch.tsx       # Autocomplete ticker search
├── hooks/
│   ├── usePortfolio.ts    # Composites holdings + live quotes → HoldingWithMetrics[]
│   └── useQuotes.ts
├── lib/
│   ├── yahoo.ts           # Yahoo Finance singleton
│   ├── redis.ts           # Upstash Redis singleton
│   ├── holdings-service.ts
│   ├── ai-providers.ts    # Provider registry (Gemini, Groq, Claude Sonnet, Claude Opus)
│   ├── prompts.ts         # All AI prompt text and builders
│   ├── ratelimit.ts       # @upstash/ratelimit config (20 req/hr per IP)
│   ├── macro-context.ts   # Redis read/write for macro commentary
│   ├── portfolio-server.ts # Server-side holdings + quotes assembly
│   ├── crypto-symbols.ts  # BTC → BTC-USD symbol mapping
│   ├── calculations.ts
│   ├── formatters.ts
│   └── types.ts
└── store/
    └── portfolioStore.ts  # Zustand store (in-memory only)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Upstash Redis](https://upstash.com) database (free tier works)
- At least one AI API key (see below)

### Environment Variables

Create a `.env.local` file in the project root:

```env
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# AI providers — at least one required; set all to enable provider switching in the UI
GEMINI_API_KEY=your_google_ai_studio_key    # Gemini 2.5 Flash
GROQ_API_KEY=your_groq_api_key              # Groq / Llama 3.3 70B
ANTHROPIC_API_KEY=your_anthropic_key        # Claude Sonnet 4.6 + Opus 4.8

# Optional: client-side password gate (baked into the bundle — not a real secret)
NEXT_PUBLIC_DASHBOARD_PASSWORD=your_password
```

Get keys at: [aistudio.google.com](https://aistudio.google.com) · [console.groq.com](https://console.groq.com) · [console.anthropic.com](https://console.anthropic.com)

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
