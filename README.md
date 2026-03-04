# Stock Performance Dashboard

A personal investment portfolio tracker built with Next.js. Track stocks, ETFs, and crypto in one place — with real-time quotes, performance charts, and AI-powered analysis.

---

## Features

### Holdings Management
- Add, edit, and delete individual holdings (stocks, ETFs, crypto)
- Track quantity, cost basis, purchase date, and industry/sector label
- Import holdings in bulk via CSV
- Import historical portfolio snapshots for trend tracking
- Confirm-to-delete safeguard to prevent accidental data loss

### Portfolio Overview
- Live total portfolio value with daily and all-time gain/loss
- Per-holding metrics: current price, daily change, total return, 52-week range
- Mover badges — click to filter the holdings table to top gainers or losers
- Manual quote refresh with optimistic UI updates

### Charts
- **Industry distribution donut chart** — visual breakdown by sector/industry with interactive legend; click a slice to overlay its gain/loss on the trend chart
- **Portfolio trend line chart** — historical portfolio value, total gain/loss, or total return % over configurable time ranges (1W → MAX, including per-year views)
- **Individual stock price chart** — intraday and multi-year price history with area fill, hover tooltips, and time range selector

### Analysis Tab
- **Market news** — broad market headlines fetched from Yahoo Finance
- **Portfolio news** — news filtered to your specific holdings, with per-symbol filtering
- **AI analysis** — LLM-powered portfolio commentary with per-holding verdict badges (BUY / HOLD / TRIM / EXIT, etc.), in English or Traditional Chinese, persisted across page reloads via Redis; choose between **Gemini 2.5 Flash** or **Groq (Llama 3.3)**

### Investment Advisor Chatbot
- **Floating chat panel** — always-accessible button in the bottom-right corner opens a conversation interface
- **Portfolio-aware context** — the LLM receives your full holdings, allocations, cost bases, and today's performance figures so answers are specific to your situation
- **Multi-LLM** — switch between **Gemini 2.5 Flash** and **Groq (Llama 3.3 70B)** mid-session via the in-header dropdown
- **Streaming responses** with a stop button; typing indicator while waiting
- **Suggested starter questions** — generic investing questions when the portfolio is empty; portfolio-specific prompts (concentration risk, drawdown analysis, trimming candidates) when holdings are loaded
- **Markdown rendering** — section headings, bullet lists, inline bold; tickers, percentages, and dollar amounts are syntax-highlighted
- **Multilingual** — respects the EN / 繁中 language toggle set in the Analysis tab

### UX Details
- **Dark mode by default** — toggleable; preference persisted to `localStorage`
- **Privacy mode** — one-click to blur all monetary values (useful for screen sharing)
- **Portfolio value toggle** — eye button on the summary card selectively hides sensitive figures (total value, invested, P&L amounts; percentage-only for today's change); hidden by default on page load
- **Password gate** — lightweight client-side access control with session persistence
- **Sticky header** — portfolio summary and navigation tabs remain visible while scrolling
- **Responsive layout** — works on mobile and desktop

---

## Changelog

### March 2026
- **Portfolio value toggle** — eye button on the summary card masks sensitive figures on the summary card: total portfolio value, total invested, and total P&L show `••••••`; today's daily change keeps the dollar amount visible but hides the percentage; hidden by default on page load
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
│   └── HistoricalImportModal.tsx
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
