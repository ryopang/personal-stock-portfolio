'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';

const SESSION_KEY = 'portfolio_unlocked';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      setUnlocked(true);
    } else {
      // Small delay so the overlay is painted before we focus
      setTimeout(() => inputRef.current?.focus(), 80);
    }
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
            <div style={{ fontSize: '2rem', marginBottom: '0.625rem' }}>🔒</div>
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
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-secondary)',
                margin: '0 0 1.5rem',
              }}
            >
              Enter your password to view
            </p>

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
