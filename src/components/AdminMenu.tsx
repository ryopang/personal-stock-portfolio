'use client';

import { useEffect, useRef, useState } from 'react';

interface AdminMenuProps {
  onAdd: () => void;
  onImportCSV: () => void;
  onImportHistory: () => void;
  onEditMacroContext: () => void;
  holdingsCount: number;
  onOpenClearModal: () => void;
}

export default function AdminMenu({
  onAdd, onImportCSV, onImportHistory, onEditMacroContext, holdingsCount, onOpenClearModal,
}: AdminMenuProps) {
  const [open, setOpen] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('portfolio_gate_disabled') !== 'true'
      : true,
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function close() { setOpen(false); }

  function toggleGate() {
    const next = !gateEnabled;
    setGateEnabled(next);
    if (next) {
      localStorage.removeItem('portfolio_gate_disabled');
    } else {
      localStorage.setItem('portfolio_gate_disabled', 'true');
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="btn-secondary flex items-center gap-1.5"
        style={{ touchAction: 'manipulation' }}
      >
        <span>Admin</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1.5 w-48 rounded-xl shadow-lg py-1 z-50"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => { close(); onAdd(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-surface-secondary transition-colors"
            style={{ color: 'var(--color-primary)', touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add holding
          </button>
          <button
            onClick={() => { close(); onImportCSV(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-surface-secondary transition-colors"
            style={{ color: 'var(--color-primary)', touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => { close(); onImportHistory(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-surface-secondary transition-colors"
            style={{ color: 'var(--color-primary)', touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Import history
          </button>
          <button
            onClick={() => { close(); onEditMacroContext(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-surface-secondary transition-colors"
            style={{ color: 'var(--color-primary)', touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
            </svg>
            Edit macro context
          </button>
          <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
          <button
            onClick={toggleGate}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-surface-secondary transition-colors"
            style={{ color: 'var(--color-primary)', touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {gateEnabled
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              }
            </svg>
            {gateEnabled ? 'Disable password gate' : 'Enable password gate'}
          </button>
          {holdingsCount > 0 && (
            <>
              <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
              <button
                onClick={() => { close(); onOpenClearModal(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-surface-secondary transition-colors"
                style={{ color: 'var(--color-loss)', touchAction: 'manipulation' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
