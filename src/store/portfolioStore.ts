'use client';

import { create } from 'zustand';
import type { Holding } from '@/lib/types';

interface PortfolioStore {
  holdings: Holding[];
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  removeHolding: (id: string) => void;
  clearHoldings: () => void;
}

export const usePortfolioStore = create<PortfolioStore>((set) => ({
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
