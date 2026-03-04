# Stock Performance Dashboard — Claude Instructions

Project-specific instructions that layer on top of `~/.claude/CLAUDE.md`.

---

## Project Overview

A personal Next.js investment portfolio tracker. Stocks, ETFs, and crypto in one place with live quotes, SVG charts, and AI analysis.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Zustand v5 · SWR · yahoo-finance2 v3 · Upstash Redis · Vercel

---

## Critical Rules

### yahoo-finance2 v3
- Default export is a **class**, not an instance. Always use the singleton at `src/lib/yahoo.ts`.
- Calling methods on the class directly (not the instance) returns `never` — the TypeScript error will be misleading.

### Upstash Redis (@upstash/redis)
- `hgetall` / `hget` **auto-deserialize JSON**. Do NOT `JSON.stringify` before `hset` and do NOT `JSON.parse` after reading.
- Pass objects directly to `hset`; use values directly after `hgetall`.
- Never use `@vercel/kv` — it is deprecated. Always import from `@upstash/redis`.

### Tailwind CSS v4
- No `tailwind.config.js`. All design tokens (colors, spacing, themes) live in `src/app/globals.css` inside `@theme inline`.
- CSS custom properties (`var(--color-*)`) do NOT resolve inside React `style={{ }}` inline styles. Use hardcoded hex values instead.
  - Gain: `#dcfce7` (bg) / `#34C759` (text)
  - Loss: `#fee2e2` (bg) / `#FF3B30` (text)
  - Hover row: `#F2F2F7`

### Crypto symbols
- User-facing and Redis storage: `BTC`, `ETH`, etc.
- Yahoo Finance fetch: `BTC-USD`, `ETH-USD`, etc.
- Use `toYahooSymbol()` / `fromYahooSymbol()` from `src/lib/crypto-symbols.ts` to convert.

### Next.js page caching
- Use `export const dynamic = 'force-dynamic'` in route handlers that must always read fresh Redis data.

---

## Key Files

| File | Purpose |
|---|---|
| `src/lib/yahoo.ts` | yahoo-finance2 singleton — always import from here |
| `src/lib/redis.ts` | Upstash Redis singleton |
| `src/lib/holdings-service.ts` | Redis CRUD (hash key: `portfolio:holdings`) |
| `src/lib/crypto-symbols.ts` | Symbol mapping helpers |
| `src/lib/calculations.ts` | Portfolio math (gain, return, cost basis) |
| `src/hooks/usePortfolio.ts` | Composites holdings + quotes → `HoldingWithMetrics[]` |
| `src/store/portfolioStore.ts` | Zustand store (in-memory only — Redis is source of truth) |
| `src/components/Dashboard.tsx` | Top-level client shell |
| `src/components/ChartsView.tsx` | All three SVG charts (donut, trend, stock price) |
| `src/app/globals.css` | Tailwind v4 design tokens and component classes |

---

## Architecture Notes

**Charts are hand-rolled SVG** — no charting library. All three charts (industry donut, portfolio trend line, stock price) are pure SVG computed in React. Don't introduce a charting library.

**Redis is the source of truth** — Zustand holds in-memory UI state only. On server error, roll back by re-fetching from `/api/holdings`.

**Snapshots are written on every quote refresh** — one `DailySnapshot` per day stored in Redis. This powers the trend chart without background jobs.

**Optimistic mutations** — add/edit/delete update Zustand immediately, then hit the API. Roll back to Redis state on failure.

**Manual refresh only** — `refreshInterval: 0` on all SWR calls. No auto-polling.

**AI providers** — both Gemini 2.5 Flash and Groq Llama 3.3 70B are supported. The provider is selectable in the UI per session. AI analysis is persisted to Redis; chatbot is ephemeral.

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `UPSTASH_REDIS_REST_URL` | Yes | Redis connection |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Redis auth |
| `GEMINI_API_KEY` | One of these | AI analysis + chatbot |
| `GROQ_API_KEY` | One of these | AI analysis + chatbot |
| `NEXT_PUBLIC_DASHBOARD_PASSWORD` | No | Client-side password gate (baked into bundle) |

---

## Design System (globals.css)

| Token | Value |
|---|---|
| background | `#F5F5F7` |
| surface | `#FFFFFF` |
| primary text | `#1D1D1F` |
| secondary text | `#6E6E73` |
| accent | `#0071E3` |
| gain | `#34C759` |
| loss | `#FF3B30` |

Component classes available: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.error-text`

---

## Common Gotchas

- **Privacy mode** — monetary values site-wide blur when `<html class="privacy-mode">` is set. The summary card has a separate per-field toggle. Don't conflate the two.
- **`NEXT_PUBLIC_*` vars** are embedded in the client bundle — never put real secrets in them.
- **Multi-lot holdings** — the same symbol can appear multiple times (different lots). Deduplication by symbol is needed for counts (type tabs, mover badges, industry chips). See existing `new Set<string>()` pattern in `HoldingsSection.tsx` and `PortfolioSummary.tsx`.
- **Stock price chart** excludes crypto from the symbol dropdown (it has its own data shape from Yahoo).
- **`.env.local` is gitignored** — never commit real credentials. Reference `.env.example` for the full list of required variables.
