# Modernization Plan — June 2026

Holistic review conclusions and the agreed upgrade plan. The core stack (Next.js 16,
React 19.2, Tailwind v4, Zustand 5, SWR, Node 22) is current — this plan targets the
AI layer, engineering hygiene, and structure, not the framework.

**Decisions made (2026-06-10):**
- Security: keep the client-side password gate as-is (accepted risk for a personal app).
  Add rate limiting on AI endpoints to cap token burn.
- AI layer: migrate to Vercel AI SDK.
- Testing: Vitest + GitHub Actions CI.
- Refactors: React Compiler, split big components, server reads its own data, Zod validation.

Each phase is an independent branch + PR, in this order.

---

## Phase 0 — Housekeeping (do first)

- [ ] Move the in-progress Claude-provider changes (`src/app/api/analysis/route.ts`,
      `src/components/AIAnalysis.tsx`) off `main` onto a feature branch and finish/merge
      them before Phase 1, since Phase 1 rewrites those files.
- [ ] Bump `@types/node` to `^22` to match the runtime.

## Phase 1 — AI layer: Vercel AI SDK migration

Replace the hand-rolled SSE parsing (OpenAI-compatible fetch path) and the separate
Anthropic SDK path with one `streamText()` code path for all four providers.

- [ ] Add deps: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/groq`.
      Remove direct `@anthropic-ai/sdk` usage once migrated.
- [ ] New `src/lib/ai-providers.ts`: provider registry (gemini / groq / claude-sonnet /
      claude-opus) returning an AI SDK model instance + label + env-key hint.
- [ ] New `src/lib/prompts.ts`: shared holdings-table/prompt builders — today duplicated
      between `analysis/route.ts` and `chat/route.ts`.
- [ ] `api/analysis`: `streamText()` with `onFinish` writing the Redis cache
      (`portfolio:analysis`), preserving the current plain-text streaming response shape.
- [ ] `api/chat`: `streamText()` + migrate `InvestmentChatbot.tsx` to `useChat`
      (chat stays ephemeral, no persistence change).
- [ ] Macro context: remove the hardcoded "early 2026" block (already stale) from both
      routes. Store it in Redis (`portfolio:macro-context`) as editable text with a
      `updatedAt` date that gets injected into the prompt, so staleness is visible to
      the model and the user. Editable via a small Admin-menu textarea.
- [ ] Rate limiting: `@upstash/ratelimit` (sliding window, e.g. 10 req/hour/IP) on
      `/api/analysis` and `/api/chat` — these endpoints spend paid tokens and have no auth.

## Phase 2 — Server reads its own data

The client currently POSTs its holdings/metrics/news to the analysis and chat routes;
the server should not trust or need that payload.

- [ ] Analysis + chat routes read holdings via `getHoldings()`, fetch quotes through the
      `src/lib/yahoo.ts` singleton, and compute metrics server-side by reusing
      `src/lib/calculations.ts` (extract any client-only bits as needed).
- [ ] Benchmark (VTI YTD/1Y) fetched server-side in the analysis route.
- [ ] Client request bodies shrink to `{ lang, provider }` (+ messages for chat).
- [ ] News stays as-is: analysis route calls the existing news-fetch logic internally
      (extract from `api/news/route.ts` into `src/lib/news.ts`).

## Phase 3 — Zod input validation

- [ ] Add `zod`. New `src/lib/schemas.ts` with schemas for: holding create/update,
      snapshot POST, snapshot import, analysis/chat request bodies, quotes/search params.
- [ ] Replace manual field checks in all route handlers; return 400 with flattened
      Zod errors. No behavior change for valid input.

## Phase 4 — React Compiler + component splits

- [ ] `next.config.ts`: `reactCompiler: true` (+ `babel-plugin-react-compiler` dev dep).
      Verify build + interactions, then remove manual `useMemo`/`useCallback` that exist
      purely for memoization (keep the ref-pattern in `usePortfolio.ts` — that's
      correctness, not memoization).
- [ ] Split `ChartsView.tsx` (1,289 lines) → `src/components/charts/`: one file per chart
      (donut / trend / stock price) + shared SVG helpers. Pure mechanical move, no
      charting library (per CLAUDE.md).
- [ ] Extract from `Dashboard.tsx` (521 lines): `AdminMenu.tsx`, `ClearAllModal.tsx`,
      and the theme/privacy toggle cluster.

## Phase 5 — Tests + CI

- [ ] Add Vitest (`vitest`, `@vitest/coverage-v8`); `npm test` script.
- [ ] Unit tests: `calculations.ts`, `crypto-symbols.ts`, `formatters.ts`,
      `schemas.ts` (Phase 3), prompt builders (Phase 1), and the news-route ticker/XML
      helpers if extracted.
- [ ] GitHub Actions workflow: lint → `tsc --noEmit` (or `next build`) → `vitest run`
      on PRs and pushes to `main`.

## Phase 6 — Small fixes

- [ ] Snapshot date bug: `usePortfolio.ts` uses UTC for the snapshot key, so an evening
      refresh in NJ writes to "tomorrow". Use the America/New_York calendar date
      (`Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`).
- [ ] Same UTC date issue in the analysis prompt's "as of" date.

---

## Explicitly out of scope (decided against)

- Server-side auth / middleware gate — accepted risk; revisit if the app is ever shared.
- Server Actions migration — current API routes + SWR optimistic updates work fine.
- Charting library — charts stay hand-rolled SVG (CLAUDE.md rule).
- State-layer changes — Zustand + SWR stays.
