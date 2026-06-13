'use client';

import { useState } from 'react';
import { useModalBehavior } from '@/hooks/useModalBehavior';
import type { Holding } from '@/lib/types';

interface Props {
  holdings: Holding[];
  onClose: () => void;
  onSave: (updates: { id: string; purchaseDate: string }[]) => Promise<void>;
}

export default function EditPurchaseDatesModal({ holdings, onClose, onSave }: Props) {
  const today = new Date().toLocaleDateString('en-CA');

  const [dates, setDates] = useState<Record<string, string>>(() =>
    Object.fromEntries(holdings.map((h) => [h.id, h.purchaseDate ?? '']))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useModalBehavior(onClose);

  const sorted = [...holdings].sort((a, b) => a.symbol.localeCompare(b.symbol));

  const changedIds = holdings
    .filter((h) => dates[h.id] !== h.purchaseDate)
    .map((h) => h.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changedIds.length === 0) { onClose(); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await onSave(changedIds.map((id) => ({ id, purchaseDate: dates[id] })));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dates-title"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-surface sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <h2 id="edit-dates-title" className="text-base font-semibold text-primary">
              Edit Purchase Dates
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
              {changedIds.length > 0 && (
                <span className="text-accent ml-1.5">· {changedIds.length} changed</span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-secondary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable list */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">
                    Symbol
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide hidden sm:table-cell">
                    Name
                  </th>
                  <th className="text-right px-5 py-2.5 text-xs font-semibold text-secondary uppercase tracking-wide">
                    Purchase Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => {
                  const changed = dates[h.id] !== h.purchaseDate;
                  return (
                    <tr
                      key={h.id}
                      className="border-b border-border last:border-0"
                      style={{ backgroundColor: changed ? 'rgba(0,113,227,0.04)' : undefined }}
                    >
                      <td className="px-5 py-3">
                        <span className="text-sm font-semibold text-primary font-mono">{h.symbol}</span>
                        {changed && (
                          <span
                            className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle"
                            title="Modified"
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="text-sm text-secondary truncate max-w-[160px] block">{h.name}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <input
                          type="date"
                          value={dates[h.id]}
                          max={today}
                          onChange={(e) =>
                            setDates((prev) => ({ ...prev, [h.id]: e.target.value }))
                          }
                          disabled={isSubmitting}
                          className="input text-sm py-1.5 px-2.5 w-[140px] text-right"
                          style={{ touchAction: 'manipulation' }}
                          aria-label={`Purchase date for ${h.symbol}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border shrink-0 space-y-3">
            {error && (
              <div className="rounded-lg bg-loss/10 border border-loss/20 px-4 py-2.5 text-sm text-loss">
                {error}
              </div>
            )}
            <div className="flex gap-3">
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
                disabled={isSubmitting || changedIds.length === 0}
                className="flex-1 btn-primary"
                style={{ touchAction: 'manipulation' }}
              >
                {isSubmitting
                  ? 'Saving…'
                  : changedIds.length === 0
                  ? 'No changes'
                  : `Save ${changedIds.length} change${changedIds.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
