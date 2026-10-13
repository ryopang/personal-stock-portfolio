'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

/** Login screen. Rendered by the server page only when there is no valid session cookie. */
export default function PasswordGate() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Small delay so the overlay is painted before we focus
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: input }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      setError(res.status === 429 ? 'Too many attempts. Try again later.' : 'Incorrect password. Try again.');
    } catch {
      setError('Could not reach the server. Try again.');
    }
    setPending(false);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        className="card"
        style={{ padding: '2rem 2rem 1.75rem', width: '100%', maxWidth: '340px', textAlign: 'center' }}
      >
        <h1
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            margin: '0 0 1.25rem',
          }}
        >
          Portfolio Tracker
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <input
            ref={inputRef}
            type="password"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            placeholder="Password"
            className="input"
            style={{ textAlign: 'center', letterSpacing: '0.1em' }}
            autoComplete="current-password"
          />
          {error && (
            <p className="error-text" style={{ margin: 0 }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={pending || !input}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
