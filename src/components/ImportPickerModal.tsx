'use client';

import { useModalBehavior } from '@/hooks/useModalBehavior';

interface Props {
  onClose: () => void;
  onPickHoldings: () => void;
  onPickHistory: () => void;
}

export default function ImportPickerModal({ onClose, onPickHoldings, onPickHistory }: Props) {
  useModalBehavior(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 space-y-3"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
          Import
        </h2>

        <button
          onClick={onPickHoldings}
          className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-colors hover:bg-surface-secondary"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: 'var(--color-accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Holdings</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-secondary)' }}>
              Import positions from a CSV file (symbol, quantity, cost basis)
            </p>
          </div>
        </button>

        <button
          onClick={onPickHistory}
          className="w-full flex items-start gap-3 p-4 rounded-xl text-left transition-colors hover:bg-surface-secondary"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: 'var(--color-accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Historical snapshots</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-secondary)' }}>
              Import past daily portfolio values to populate the trend chart
            </p>
          </div>
        </button>

        <button onClick={onClose} className="w-full btn-secondary mt-2">
          Cancel
        </button>
      </div>
    </div>
  );
}
