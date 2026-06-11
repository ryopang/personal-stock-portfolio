'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { mutate } from 'swr';
import { usePortfolioStore } from '@/store/portfolioStore';
import { usePortfolio } from '@/hooks/usePortfolio';
import PortfolioSummary from './PortfolioSummary';
import HoldingsSection from './HoldingsSection';
import AddHoldingModal from './AddHoldingModal';
import CSVImportModal from './CSVImportModal';
import HistoricalImportModal from './HistoricalImportModal';
import MacroContextModal from './MacroContextModal';
import AdminMenu from './AdminMenu';
import ClearAllModal from './ClearAllModal';
import EmptyState from './EmptyState';
import ChartsView from './ChartsView';
import AnalysisTab from './AnalysisTab';
import InvestmentChatbot from './InvestmentChatbot';
import { SummarySkeleton, TableSkeleton } from './LoadingSkeleton';
import type { Holding, HoldingWithMetrics, AssetType } from '@/lib/types';

interface Props {
  initialHoldings: Holding[];
}

export default function Dashboard({ initialHoldings }: Props) {
  const setHoldings = usePortfolioStore((s) => s.setHoldings);
  const addHolding = usePortfolioStore((s) => s.addHolding);
  const updateHolding = usePortfolioStore((s) => s.updateHolding);
  const removeHolding = usePortfolioStore((s) => s.removeHolding);
  const clearHoldingsStore = usePortfolioStore((s) => s.clearHoldings);
  const holdings = usePortfolioStore((s) => s.holdings);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<HoldingWithMetrics | null>(null);
  const [csvImportOpen, setCSVImportOpen] = useState(false);
  const [historicalImportOpen, setHistoricalImportOpen] = useState(false);
  const [macroContextOpen, setMacroContextOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'portfolio' | 'charts' | 'analysis'>('portfolio');
  const [moverFilter, setMoverFilter] = useState<'gainers' | 'losers' | null>(null);
  const [lang, setLang] = useState<'en' | 'zh-TW'>('zh-TW');
  const stickyBandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stickyBandRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty('--sticky-top', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved !== 'light';
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Hydrate Zustand store from server-fetched initial holdings
  useEffect(() => {
    setHoldings(initialHoldings);
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { holdingsWithMetrics, totals, isLoading, isRefreshing, error, refresh, lastUpdated, missingQuoteSymbols } =
    usePortfolio();

  const handleAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleEdit = (holding: HoldingWithMetrics) => {
    setEditTarget(holding);
    setModalOpen(true);
  };

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Remove this holding from your portfolio?')) return;
    // Optimistic update
    removeHolding(id);
    try {
      const res = await fetch(`/api/holdings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    } catch {
      // Restore on failure — re-fetch from server
      const res = await fetch('/api/holdings');
      const data = await res.json();
      setHoldings(data.holdings ?? []);
    }
  }, [removeHolding, setHoldings]);

  const handleClearAll = useCallback(async () => {
    clearHoldingsStore();
    setClearModalOpen(false);
    try {
      const res = await fetch('/api/holdings', { method: 'DELETE' });
      if (!res.ok) throw new Error('Clear failed');
    } catch {
      // Restore on failure
      const res = await fetch('/api/holdings');
      const data = await res.json();
      setHoldings(data.holdings ?? []);
    }
  }, [clearHoldingsStore, setHoldings]);

  const handleImportComplete = useCallback(async (importedHoldings: Holding[]) => {
    for (const h of importedHoldings) addHolding(h);
    setCSVImportOpen(false);
    await refresh();
  }, [addHolding, refresh]);

  const handleHistoricalImportComplete = useCallback(() => {
    setHistoricalImportOpen(false);
    mutate((key: unknown) => typeof key === 'string' && key.startsWith('/api/portfolio/snapshots'));
  }, []);

  const handleSave = useCallback(async (payload: {
    id?: string;
    symbol: string;
    name: string;
    type: AssetType;
    quantity: number;
    costBasis: number;
    purchaseDate: string;
    industry?: string;
  }) => {
    if (payload.id) {
      // Edit
      const res = await fetch(`/api/holdings/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: payload.quantity,
          costBasis: payload.costBasis,
          purchaseDate: payload.purchaseDate,
          type: payload.type,
          industry: payload.industry,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to update holding');
      }
      const data = await res.json();
      updateHolding(payload.id, data.holding);
    } else {
      // Add
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to add holding');
      }
      const data = await res.json();
      addHolding(data.holding);
    }
    // Refresh quotes to include any new symbols
    await refresh();
  }, [addHolding, updateHolding, refresh]);

  return (
    <div className="min-h-dvh bg-background">
      {/* Sticky top band: header + view tabs + portfolio summary */}
      <div ref={stickyBandRef} className="sticky top-0 z-40 bg-background/90 backdrop-blur-md">

      {/* Page header */}
      <header className="">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-primary tracking-widest uppercase">Ryo&apos;s Investment Portfolio</h1>
            <p className="text-xs text-tertiary mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Privacy mode toggle */}
            <button
              onClick={() => {
                const next = !privacyMode;
                setPrivacyMode(next);
                document.documentElement.classList.toggle('privacy-mode', next);
              }}
              className="btn-secondary rounded-lg"
              style={{ padding: '0.625rem' }}
              aria-label={privacyMode ? 'Show values' : 'Hide values'}
              title={privacyMode ? 'Show values' : 'Hide values'}
            >
              {privacyMode ? (
                /* Eye-off icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                /* Eye icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="btn-secondary rounded-lg"
              style={{ padding: '0.625rem' }}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                /* Sun icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                /* Moon icon */
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            {/* Admin dropdown */}
            <AdminMenu
              onAdd={handleAdd}
              onImportCSV={() => setCSVImportOpen(true)}
              onImportHistory={() => setHistoricalImportOpen(true)}
              onEditMacroContext={() => setMacroContextOpen(true)}
              holdingsCount={holdings.length}
              onOpenClearModal={() => setClearModalOpen(true)}
            />
          </div>
        </div>
      </header>

      {/* View tabs + portfolio summary inside the sticky band */}
      {holdings.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* View tabs */}
          <div className="flex gap-1 border-b border-border pb-0">
            {(['portfolio', 'charts', 'analysis'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className="px-4 py-3 sm:py-2 text-sm font-medium capitalize transition-colors relative"
                style={{
                  color: activeView === view ? 'var(--color-primary)' : 'var(--color-secondary)',
                  touchAction: 'manipulation',
                }}
              >
                {view === 'portfolio' ? 'Holdings' : view === 'charts' ? 'Charts' : 'Analysis'}
                {activeView === view && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: '#0071E3' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Portfolio summary */}
          {(activeView === 'portfolio') && (
            <div className="pt-4 pb-4">
              {!hydrated && initialHoldings.length > 0 ? (
                <SummarySkeleton />
              ) : (
                <PortfolioSummary
                  holdings={holdingsWithMetrics}
                  totals={totals}
                  isLoading={isLoading}
                  isRefreshing={isRefreshing}
                  lastUpdated={lastUpdated}
                  onRefresh={refresh}
                  moverFilter={moverFilter}
                  onMoverFilter={setMoverFilter}
                />
              )}
            </div>
          )}
        </div>
      )}

      </div>{/* end sticky band */}

      {/* Scrollable content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {error && (
          <div className="rounded-xl bg-loss/10 border border-loss/20 px-4 py-3 text-sm text-loss">
            Failed to fetch prices. Check your connection and try refreshing.
          </div>
        )}
        {missingQuoteSymbols.length > 0 && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)', color: '#92400e' }}>
            Could not fetch prices for: <span className="font-semibold">{missingQuoteSymbols.join(', ')}</span>. These holdings are hidden from the table. Check that the symbol and asset type are correct.
          </div>
        )}

        {!hydrated && initialHoldings.length > 0 ? (
          <TableSkeleton rows={initialHoldings.length} />
        ) : holdings.length === 0 && !isLoading ? (
          <EmptyState onAdd={handleAdd} />
        ) : activeView === 'portfolio' ? (
          <HoldingsSection
            holdings={holdingsWithMetrics}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            moverFilter={moverFilter}
          />
        ) : activeView === 'charts' ? (
          <ChartsView holdings={holdingsWithMetrics} />
        ) : (
          <AnalysisTab holdings={holdingsWithMetrics} lang={lang} onLangChange={setLang} />
        )}
      </main>

      {/* Add / Edit modal */}
      {modalOpen && (
        <AddHoldingModal
          holding={editTarget}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}

      {/* CSV import modal */}
      {csvImportOpen && (
        <CSVImportModal
          onClose={() => setCSVImportOpen(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Historical snapshot import modal */}
      {historicalImportOpen && (
        <HistoricalImportModal
          onClose={() => setHistoricalImportOpen(false)}
          onImportComplete={handleHistoricalImportComplete}
        />
      )}

      {/* Macro context editor */}
      {macroContextOpen && (
        <MacroContextModal onClose={() => setMacroContextOpen(false)} />
      )}

      {/* Investment advisor chatbot */}
      <InvestmentChatbot holdings={holdingsWithMetrics} lang={lang} />

      {/* Clear all confirmation modal */}
      {clearModalOpen && (
        <ClearAllModal
          holdingsCount={holdings.length}
          onClose={() => setClearModalOpen(false)}
          onConfirm={handleClearAll}
        />
      )}
    </div>
  );
}
