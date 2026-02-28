'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { HoldingWithMetrics } from '@/lib/types';
import type { NewsItem } from '@/app/api/news/route';

interface Props {
  holdings: HoldingWithMetrics[];
  articles: NewsItem[];
  lang: 'en' | 'zh-TW';
}

type Status = 'idle' | 'streaming' | 'done' | 'error';
type Provider = 'gemini' | 'groq';

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'gemini', label: 'Gemini 2.5 Flash' },
  { id: 'groq',   label: 'Groq (Llama 3.3)' },
];

type VerdictAction = 'STRONG HOLD' | 'BUY MORE' | 'BUY' | 'HOLD' | 'MONITOR' | 'TRIM' | 'HARVEST LOSS' | 'CONSIDER EXIT' | 'EXIT' | 'SELL';
const VERDICT_STYLES: Record<VerdictAction, { bg: string; text: string; label: string }> = {
  'STRONG HOLD':   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'STRONG HOLD'   },
  'BUY MORE':      { bg: 'bg-green-100',  text: 'text-green-700',  label: 'BUY MORE'      },
  'BUY':           { bg: 'bg-green-100',  text: 'text-green-700',  label: 'BUY'           },
  'HOLD':          { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'HOLD'          },
  'MONITOR':       { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'MONITOR'       },
  'TRIM':          { bg: 'bg-orange-100', text: 'text-orange-600', label: 'TRIM'          },
  'HARVEST LOSS':  { bg: 'bg-blue-100',   text: 'text-blue-600',   label: 'HARVEST LOSS'  },
  'CONSIDER EXIT': { bg: 'bg-orange-100', text: 'text-orange-600', label: 'CONSIDER EXIT' },
  'EXIT':          { bg: 'bg-red-100',    text: 'text-red-600',    label: 'EXIT'          },
  'SELL':          { bg: 'bg-red-100',    text: 'text-red-600',    label: 'SELL'          },
};

/** Minimal markdown → JSX: handles **bold**, ## headers, - bullets, newlines */
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }

    // ### Sub-heading
    if (line.startsWith('### ')) {
      elements.push(
        <p key={key++} className="text-xs font-semibold uppercase tracking-wide text-secondary mt-4 mb-1">
          {line.slice(4)}
        </p>,
      );
      continue;
    }

    // ## Heading
    if (line.startsWith('## ')) {
      elements.push(
        <p key={key++} className="text-xs font-bold uppercase tracking-wide text-secondary mt-4 mb-1 border-t border-gray-100 pt-3">
          {line.slice(3)}
        </p>,
      );
      continue;
    }

    // Bullet — check for verdict pattern: "TICKER: ACTION — reason"
    if (line.startsWith('- ')) {
      const verdictMatch = line.slice(2).match(/^(\*?\*?([A-Z0-9.\-]+)\*?\*?)\s*:\s*(STRONG HOLD|BUY MORE|HARVEST LOSS|CONSIDER EXIT|BUY|HOLD|MONITOR|TRIM|EXIT|SELL)\b(.*)$/i);
      if (verdictMatch) {
        const ticker = verdictMatch[2].toUpperCase();
        const action = verdictMatch[3].toUpperCase() as VerdictAction;
        const rest = verdictMatch[4];
        const { bg, text: textColor, label } = VERDICT_STYLES[action] ?? VERDICT_STYLES['HOLD'];
        elements.push(
          <div key={key++} className="flex items-baseline gap-2 text-sm leading-relaxed">
            <span className="shrink-0 font-bold privacy-blur" style={{ color: '#0071E3' }}>{ticker}</span>
            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${bg} ${textColor}`}>{label}</span>
            <span className="text-primary">{inlineBold(rest.replace(/^\s*[—–-]\s*/, ''))}</span>
          </div>,
        );
        continue;
      }
      elements.push(
        <div key={key++} className="flex gap-1.5 text-sm text-primary leading-relaxed">
          <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-secondary" />
          <span>{inlineBold(line.slice(2))}</span>
        </div>,
      );
      continue;
    }

    // Regular paragraph line (may contain **bold** and **Header** —)
    elements.push(
      <p key={key++} className="text-sm text-primary leading-relaxed">
        {inlineBold(line)}
      </p>,
    );
  }

  return elements;
}

// Words that look like tickers but aren't
const TICKER_EXCLUDE = new Set([
  'SELL','BUY','HOLD','TRIM','ADD','THE','AND','OR','IN','OF','TO','BY','FOR',
  'NOT','ALL','NEW','TOP','KEY','ETF','USD','OTHER','HIGH','LOW','DUE','ITS',
  'AS','IS','AT','BE','AN','ON','IF','BUT','WITH','FROM','ARE','CAN','MAY',
  'WILL','EACH','BOTH','MORE','LESS','SOME','INC','TECH','SECTOR','MARKET',
  'REVIEW','REBALANCE','THIS','THAT','THEY','WERE','BEEN','HAVE','HAS','HAD',
  'DO','DOES','GET','ITS','NO','SO','US','ME','WE','HE','IT','UP',
]);

// Combined inline formatter: **bold** | $amount | percentage | TICKER
const INLINE_RE = /(\*\*[^*]+\*\*|\$[\d,]+(?:\.\d+)?[KMBkmb]?|[+-]?\d+(?:\.\d+)?%|\b[A-Z]{2,5}(?:-[A-Z])?\b)/g;

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
    }
    if (/^\$[\d,]+(?:\.\d+)?[KMBkmb]?$/.test(part)) {
      return <span key={i} className="privacy-blur" style={{ color: '#10B981' }}>{part}</span>;
    }
    if (/^[+-]?\d+(?:\.\d+)?%$/.test(part)) {
      return <span key={i} className="privacy-blur" style={{ color: '#F59E0B' }}>{part}</span>;
    }
    if (/^[A-Z]{2,5}(?:-[A-Z])?$/.test(part) && !TICKER_EXCLUDE.has(part)) {
      return <span key={i} className="privacy-blur" style={{ color: '#0071E3' }}>{part}</span>;
    }
    return part;
  });
}

function formatAge(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AIAnalysis({ holdings, articles, lang }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [text, setText] = useState('');
  const [provider, setProvider] = useState<Provider>('gemini');
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load cached analysis on mount
  useEffect(() => {
    fetch('/api/analysis')
      .then(r => r.json())
      .then(({ cached }) => {
        if (cached?.text) {
          setText(cached.text);
          setStatus('done');
          setGeneratedAt(cached.generatedAt);
          if (cached.provider) setProvider(cached.provider as Provider);
        }
      })
      .catch(() => {});
  }, []);

  const run = useCallback(async () => {
    if (status === 'streaming') {
      abortRef.current?.abort();
      setStatus('idle');
      return;
    }

    setText('');
    setStatus('streaming');
    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings, articles, lang, provider }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed.' }));
        setText(error ?? 'Something went wrong.');
        setStatus('error');
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((prev) => {
          const next = prev + decoder.decode(value, { stream: true });
          // Auto-scroll to bottom as text streams in
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          });
          return next;
        });
      }

      setStatus('done');
      setGeneratedAt(Date.now());
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setStatus('idle');
      } else {
        setText('Failed to reach the analysis API. Check your GEMINI_API_KEY.');
        setStatus('error');
      }
    }
  }, [holdings, articles, lang, status, provider]);


  return (
    <div className="space-y-3 flex flex-col h-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            AI Analysis
          </p>
          {generatedAt && status !== 'streaming' && (
            <span className="text-[10px] text-secondary opacity-60">
              {formatAge(generatedAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value as Provider)}
            disabled={status === 'streaming'}
            className="text-xs font-medium rounded-lg px-2.5 py-1 outline-none"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={!holdings.length}
            className="btn-primary text-xs px-3 py-1.5 gap-1.5"
          >
            {status === 'streaming' ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Stop
              </>
            ) : status === 'done' ? (
              'Regenerate'
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4a.75.75 0 0 0-1.5 0v3.25L5.22 9.78a.75.75 0 1 0 1.06 1.06l2.25-2.25A.75.75 0 0 0 8.75 8V5z"/>
                </svg>
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content panel */}
      <div
        ref={scrollRef}
        className="thin-scroll flex-1 min-h-0 overflow-y-auto card p-4"
      >
        {status === 'idle' && !text && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-primary mb-1">Portfolio Intelligence</p>
              <p className="text-xs text-secondary max-w-[220px]">
                Click Analyze for a fiduciary-grade portfolio review across a 3–10 year horizon.
              </p>
            </div>
          </div>
        )}

        {(status === 'streaming' || status === 'done' || status === 'error') && (
          <div className="space-y-0.5">
            {renderMarkdown(text)}
            {status === 'streaming' && (
              <span className="inline-block w-0.5 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
      </div>

    </div>
  );
}
