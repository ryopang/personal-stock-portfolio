'use client';

import { useEffect, useState } from 'react';
import { useModalBehavior } from '@/hooks/useModalBehavior';

interface Props {
  onClose: () => void;
}

// Editor for the user-maintained macro/market notes injected into AI prompts.
// Stored in Redis so it can be refreshed without a deploy.
export default function MacroContextModal({ onClose }: Props) {
  const [text, setText] = useState('');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalBehavior(onClose);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/macro-context')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setText(data.macro?.text ?? '');
        setUpdatedAt(data.macro?.updatedAt ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load saved notes.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/macro-context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="macro-context-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <div>
          <h2 id="macro-context-title" className="text-base font-semibold" style={{ color: 'var(--color-primary)' }}>
            Macro context for AI analysis
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-secondary)' }}>
            Market notes injected into the analysis and chatbot prompts. Keep it current —
            the AI sees the last-updated date.
            {updatedAt && (
              <> Last updated {new Date(updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</>
            )}
          </p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading || saving}
          rows={12}
          maxLength={4000}
          placeholder={loading ? 'Loading…' : 'e.g. rate environment, dominant themes, key risks — leave empty to omit macro context from prompts'}
          className="input resize-y font-mono"
          style={{ fontSize: '0.75rem', lineHeight: 1.5, minHeight: '200px' }}
        />
        <p className="text-[10px] text-right" style={{ color: 'var(--color-secondary)' }}>
          {text.length}/4000
        </p>

        {error && <p className="error-text">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 btn-primary" disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
