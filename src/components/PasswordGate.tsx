'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { usePortfolioData } from '@/hooks/usePortfolio';
import { formatCurrencyK } from '@/lib/formatters';

const SESSION_KEY = 'portfolio_unlocked';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      sessionStorage.getItem(SESSION_KEY) === 'true' ||
      localStorage.getItem('portfolio_gate_disabled') === 'true'
    );
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shares the same Zustand store + SWR cache as Dashboard, so this doesn't
  // trigger an extra quote fetch — it just reads whatever Dashboard already loaded.
  const { totals, holdingsWithMetrics } = usePortfolioData();
  const dataReady = holdingsWithMetrics.length > 0;
  const isGain = totals.dailyChange > 0;
  const isLoss = totals.dailyChange < 0;
  const dailyChangeSign = isGain ? '+' : isLoss ? '-' : '';

  useEffect(() => {
    // Small delay so the overlay is painted before we focus
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const password = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD ?? '';
    if (input === password) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  return (
    <div>
      {/* Content — always rendered for SSR, visually locked when not unlocked */}
      <div
        style={
          unlocked
            ? {}
            : { filter: 'blur(18px)', pointerEvents: 'none', userSelect: 'none' }
        }
      >
        {children}
      </div>

      {/* Lock overlay */}
      {!unlocked && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(245, 245, 247, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              padding: '2rem 2rem 1.75rem',
              width: '100%',
              maxWidth: '340px',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                margin: '0 0 0.25rem',
              }}
            >
              Portfolio Tracker
            </h1>

            {dataReady ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0.625rem 0 1.25rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  fontSize: '1.0625rem',
                  fontWeight: 700,
                  backgroundColor: isGain ? '#dcfce7' : isLoss ? '#fee2e2' : 'var(--color-surface-secondary)',
                  color: isGain ? '#34C759' : isLoss ? '#FF3B30' : 'var(--color-secondary)',
                }}
              >
                <span style={{ fontSize: '0.875em' }}>{isGain ? '▲' : isLoss ? '▼' : '–'}</span>
                <span>
                  {dailyChangeSign}
                  {formatCurrencyK(Math.abs(totals.dailyChange))} today
                </span>
              </div>
            ) : (
              <div
                className="animate-pulse"
                style={{
                  height: '2.25rem',
                  width: '11rem',
                  borderRadius: '999px',
                  backgroundColor: 'var(--color-surface-secondary)',
                  margin: '0.625rem auto 1.25rem',
                }}
              />
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}
            >
              <input
                ref={inputRef}
                type="password"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(false);
                }}
                placeholder="Password"
                className="input"
                style={{ textAlign: 'center', letterSpacing: '0.1em' }}
                autoComplete="current-password"
              />
              {error && (
                <p className="error-text" style={{ margin: 0 }}>
                  Incorrect password. Try again.
                </p>
              )}
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Unlock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
