'use client';

import { useState } from 'react';

interface ClearAllModalProps {
  holdingsCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearAllModal({ holdingsCount, onClose, onConfirm }: ClearAllModalProps) {
  const [confirmText, setConfirmText] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-loss/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-loss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>Delete all holdings?</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-secondary)' }}>
              This will permanently remove all {holdingsCount} holdings. This cannot be undone.
            </p>
          </div>
        </div>

        <div>
          <label className="label">Type <span className="font-mono font-bold text-loss">DELETE</span> to confirm</label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && confirmText === 'DELETE') onConfirm();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="DELETE"
            autoFocus
            className="input"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={confirmText !== 'DELETE'}
            className="flex-1 btn-primary"
            style={{ backgroundColor: confirmText === 'DELETE' ? 'var(--color-loss)' : undefined }}
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  );
}
