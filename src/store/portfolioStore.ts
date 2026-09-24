'use client';

import { create } from 'zustand';
import type { Holding } from '@/lib/types';
import { DEFAULT_PORTFOLIO, type PortfolioId } from '@/lib/portfolios';

interface PortfolioStore {
  activePortfolio: PortfolioId;
  /** Switches person and empties holdings so one person's data never renders under another's name. */
  setActivePortfolio: (id: PortfolioId) => void;
  holdings: Holding[];
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  clearHoldings: () => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
  activePortfolio: DEFAULT_PORTFOLIO,
  setActivePortfolio: (id) => set({ activePortfolio: id, holdings: [] }),

  holdings: [],

  setHoldings: (holdings) => set({ holdings }),

  addHolding: (holding) =>
    set((state) => ({ holdings: [...state.holdings, holding] })),

  updateHolding: (id, updates) =>
    set((state) => ({
      holdings: state.holdings.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),

  removeHolding: (id) =>
    set((state) => ({
      holdings: state.holdings.filter((h) => h.id !== id),
    })),

  clearHoldings: () => set({ holdings: [] }),
}));
