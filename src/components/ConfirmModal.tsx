'use client';

import { useModalBehavior } from '@/hooks/useModalBehavior';

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({ title, body, confirmLabel, destructive, onConfirm, onClose }: Props) {
  useModalBehavior(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Icon + heading */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: destructive ? 'rgba(255,59,48,0.12)' : 'rgba(0,113,227,0.12)' }}
          >
            {destructive ? (
              <svg className="w-5 h-5 text-loss" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
          </div>
          <div>
            <h2 id="confirm-modal-title" className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>
              {title}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-secondary)' }}>{body}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button autoFocus onClick={onClose} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn-primary"
            style={destructive ? { backgroundColor: 'var(--color-loss)' } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
