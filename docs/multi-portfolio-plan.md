# Multi-portfolio toggle — Ryo / Joey / Shela

**Decisions (2026-09-23):** no per-person PIN (Ryo is the sole user); always start on Ryo;
names are "Ryo's / Joey's / Shela's Investment Portfolio" (renamable); AI prompts identical
for everyone, but analysing the selected person's holdings; macro context stays shared.

## Data model
`PortfolioId = 'ryo' | 'joey' | 'shela'` in `src/lib/portfolios.ts` (ids, default names, validator).

Redis keys are namespaced per person. Ryo keeps the **existing keys untouched** (no migration):

| Data | Ryo (unchanged) | Joey / Shela |
|---|---|---|
| holdings | `portfolio:holdings` | `portfolio:joey:holdings` |
| snapshots | `portfolio:snapshots` | `portfolio:joey:snapshots` |
| analysis cache | `portfolio:analysis` | `portfolio:joey:analysis` |
| name | `portfolio:name` | `portfolio:joey:name` |

`portfolio:macro-context` is shared.

## Server
- Every portfolio-scoped route takes `?portfolio=<id>` (default `ryo`, invalid → 400):
  `holdings`, `holdings/[id]`, `portfolio/snapshots` (+ `/import`), `portfolio-name`,
  `analysis`, `chat` (body field). `news`, `quotes`, `history`, `search` take symbols already — unchanged.
- `holdings-service.ts`, `portfolio-server.ts` (`getPortfolioWithMetrics`) take a `PortfolioId`.
- `page.tsx` still server-loads Ryo's holdings as the initial state.

## Client
- `portfolioStore` gains `activePortfolio` (starts `'ryo'`, not persisted). Switching clears
  holdings, then re-fetches `/api/holdings?portfolio=…` (SWR keys include the id, so quotes,
  snapshots and analysis don't leak between people).
- Toggle (segmented control: Ryo | Joey | Shela) in the sticky header, visible on Holdings,
  Charts and Analysis; the tab stays the same on switch.
- All Dashboard mutations (add/edit/delete/clear/CSV/historical import/rename/edit dates),
  the snapshot write in `usePortfolio`, AIAnalysis, chatbot, ChartsView and PortfolioNews use the
  active id. Chatbot history and per-view filters reset on switch.
- **Password gate:** always shows Ryo's daily change. It gets its own small `useRyoDailyChange`
  path (holdings from `/api/holdings?portfolio=ryo` + quotes) instead of the shared store, so the
  toggle can never leak Joey/Shela numbers onto the lock screen. Nothing else changes about the gate.
- Portfolio-scoped admin text (clear-confirm modal, headings) names the active person.

## Edge cases / risks
- Empty Joey/Shela portfolios: reuse `EmptyState`; AI analysis shows its empty prompt.
- Race on fast toggling: ignore responses whose portfolio id no longer matches (SWR key + guard on the holdings fetch).
- Snapshot writes must never go to the wrong person: the id is captured when the quote refresh fires.
- Demo mode: toggle hidden, behaviour unchanged.
- No test suite exists; verify by running the dev server and toggling through all three tabs
  with a temporary Joey holding, then deleting it.

## Steps (one branch `feat/multi-portfolio`, small commits)
1. `portfolios.ts` + key helpers; thread `PortfolioId` through services and API routes.
2. Store + Dashboard wiring + toggle UI; SWR keys.
3. Charts / analysis / chatbot / news pass the id.
4. Password gate → Ryo-only data path.
5. Manual verification, lint, build; changelog + version bump (as in recent commits).
