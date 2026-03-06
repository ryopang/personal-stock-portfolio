'use client';

import { useState, useEffect } from 'react';
import SymbolSearch from './SymbolSearch';
import type { HoldingWithMetrics, AssetType } from '@/lib/types';

interface Props {
  holding?: HoldingWithMetrics | null; // null/undefined = add mode, value = edit mode
  onClose: () => void;
  onSave: (holding: {
    id?: string;
    symbol: string;
    name: string;
    type: AssetType;
    quantity: number;
    costBasis: number;
    purchaseDate: string;
    industry?: string;
  }) => Promise<void>;
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'stock', label: 'Stock' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
];

export default function AddHoldingModal({ holding, onClose, onSave }: Props) {
  const isEdit = !!holding;

  const [symbol, setSymbol] = useState(holding?.symbol ?? '');
  const [name, setName] = useState(holding?.name ?? '');
  const [type, setType] = useState<AssetType>(holding?.type ?? 'stock');
  const [quantity, setQuantity] = useState(holding ? String(holding.quantity) : '');
  const [costBasis, setCostBasis] = useState(holding ? String(holding.costBasis) : '');
  const [purchaseDate] = useState(
    holding?.purchaseDate ?? new Date().toISOString().slice(0, 10)
  );
  const [industry, setIndustry] = useState(holding?.industry ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prevent scroll behind modal
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!symbol.trim()) errs.symbol = 'Symbol is required';
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) errs.quantity = 'Enter a positive quantity';
    const cost = parseFloat(costBasis);
    if (!costBasis || isNaN(cost) || cost <= 0) errs.costBasis = 'Enter a positive cost basis';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setIsSubmitting(true);
    setErrors({});
    try {
      await onSave({
        ...(isEdit ? { id: holding!.id } : {}),
        symbol: symbol.toUpperCase(),
        name,
        type,
        quantity: parseFloat(quantity),
        costBasis: parseFloat(costBasis),
        purchaseDate,
        industry: industry.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-md bg-surface sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-primary">
            {isEdit ? 'Edit Holding' : 'Add Holding'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-secondary transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-5 space-y-4">
            {/* Symbol search — only in add mode */}
            {!isEdit && (
              <div>
                <label className="label">Symbol</label>
                <SymbolSearch
                  value={symbol}
                  onChange={(sym, n, t) => {
                    setSymbol(sym);
                    setName(n);
                    setType(t);
                    setErrors((prev) => ({ ...prev, symbol: '' }));
                  }}
                  disabled={isSubmitting}
                />
                {errors.symbol && <p className="error-text">{errors.symbol}</p>}
              </div>
            )}

            {/* In edit mode, show symbol as read-only */}
            {isEdit && (
              <div>
                <label className="label">Symbol</label>
                <div className="input bg-surface-secondary text-secondary cursor-not-allowed">
                  {holding!.symbol} — {holding!.name}
                </div>
              </div>
            )}

            {/* Type selector */}
            <div>
              <label className="label">Asset type</label>
              <div className="flex gap-2">
                {ASSET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    disabled={isSubmitting || isEdit}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      type === t.value
                        ? 'bg-primary text-surface'
                        : 'bg-surface-secondary text-secondary hover:text-primary'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="label" htmlFor="quantity">
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setErrors((prev) => ({ ...prev, quantity: '' }));
                }}
                placeholder="e.g. 10 or 0.5"
                min="0"
                step="any"
                disabled={isSubmitting}
                className="input w-full"
              />
              {errors.quantity && <p className="error-text">{errors.quantity}</p>}
            </div>

            {/* Cost basis */}
            <div>
              <label className="label" htmlFor="costBasis">
                Cost basis (per share/unit)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary text-sm">$</span>
                <input
                  id="costBasis"
                  type="number"
                  inputMode="decimal"
                  value={costBasis}
                  onChange={(e) => {
                    setCostBasis(e.target.value);
                    setErrors((prev) => ({ ...prev, costBasis: '' }));
                  }}
                  placeholder="0.00"
                  min="0"
                  step="any"
                  disabled={isSubmitting}
                  className="input w-full pl-7"
                />
              </div>
              {errors.costBasis && <p className="error-text">{errors.costBasis}</p>}
            </div>

            {/* Industry */}
            <div>
              <label className="label" htmlFor="industry">
                Industry <span className="text-tertiary font-normal normal-case">(optional)</span>
              </label>
              <input
                id="industry"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Tech, Crypto, Auto"
                disabled={isSubmitting}
                className="input w-full"
              />
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="rounded-lg bg-loss/10 border border-loss/20 px-4 py-3 text-sm text-loss">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 btn-secondary"
              style={{ touchAction: 'manipulation' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary"
              style={{ touchAction: 'manipulation' }}
            >
              {isSubmitting
                ? isEdit ? 'Saving…' : 'Adding…'
                : isEdit ? 'Save changes' : 'Add holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
