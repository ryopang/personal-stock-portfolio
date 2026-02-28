'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { HoldingWithMetrics, PortfolioTotals } from '@/lib/types';

type Role = 'user' | 'assistant';
type Provider = 'gemini' | 'groq';

interface Message {
  role: Role;
  content: string;
}

interface Props {
  holdings: HoldingWithMetrics[];
  totals: PortfolioTotals;
  lang: 'en' | 'zh-TW';
}

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'gemini', label: 'Gemini 2.5 Flash' },
  { id: 'groq',   label: 'Groq (Llama 3.3)' },
];

const GENERIC_QUESTIONS = [
  'What is dollar-cost averaging and should I use it?',
  'How should I think about portfolio diversification?',
  'What\'s the difference between growth and value investing?',
  'How do I evaluate if a stock is overvalued?',
];

const PORTFOLIO_QUESTIONS = [
  'Which of my holdings has the strongest long-term outlook?',
  'Am I over-concentrated in any sector?',
  'Which positions should I consider trimming or exiting?',
  'How would my portfolio hold up in a 30% market drawdown?',
];

// Shared inline formatters (same as AIAnalysis)
const TICKER_EXCLUDE = new Set([
  'SELL','BUY','HOLD','TRIM','ADD','THE','AND','OR','IN','OF','TO','BY','FOR',
  'NOT','ALL','NEW','TOP','KEY','ETF','USD','OTHER','HIGH','LOW','DUE','ITS',
  'AS','IS','AT','BE','AN','ON','IF','BUT','WITH','FROM','ARE','CAN','MAY',
  'WILL','EACH','BOTH','MORE','LESS','SOME','INC','TECH','SECTOR','MARKET',
  'DO','DOES','GET','NO','SO','US','ME','WE','HE','IT','UP',
]);

const INLINE_RE = /(\*\*[^*]+\*\*|\$[\d,]+(?:\.\d+)?[KMBkmb]?|[+-]?\d+(?:\.\d+)?%|\b[A-Z]{2,5}(?:-[A-Z])?\b)/g;

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
    }
    if (/^\$[\d,]+(?:\.\d+)?[KMBkmb]?$/.test(part)) {
      return <span key={i} style={{ color: '#10B981' }}>{part}</span>;
    }
    if (/^[+-]?\d+(?:\.\d+)?%$/.test(part)) {
      return <span key={i} style={{ color: '#F59E0B' }}>{part}</span>;
    }
    if (/^[A-Z]{2,5}(?:-[A-Z])?$/.test(part) && !TICKER_EXCLUDE.has(part)) {
      return <span key={i} style={{ color: '#0071E3' }}>{part}</span>;
    }
    return part;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (!line.trim()) {
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <p key={key++} className="text-[11px] font-bold uppercase tracking-wide text-secondary mt-3 mb-0.5 border-t border-border pt-2">
          {line.slice(3)}
        </p>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <p key={key++} className="text-[11px] font-semibold uppercase tracking-wide text-secondary mt-2 mb-0.5">
          {line.slice(4)}
        </p>,
      );
      continue;
    }
    if (line.startsWith('- ')) {
      elements.push(
        <div key={key++} className="flex gap-1.5 text-sm text-primary leading-relaxed">
          <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-secondary" />
          <span>{inlineBold(line.slice(2))}</span>
        </div>,
      );
      continue;
    }
    elements.push(
      <p key={key++} className="text-sm text-primary leading-relaxed">
        {inlineBold(line)}
      </p>,
    );
  }

  return elements;
}

export default function InvestmentChatbot({ holdings, totals, lang }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [provider, setProvider] = useState<Provider>('gemini');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const send = useCallback(async (userText: string) => {
    const text = userText.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    // Placeholder for the assistant reply we'll stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, provider, holdings, totals, lang }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed.' }));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: `Error: ${error ?? 'Something went wrong.'}` };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Failed to reach the chat API. Check your API key configuration.',
          };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  }, [messages, streaming, provider, holdings, totals, lang]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
    if (e.key === 'Escape') setOpen(false);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setInput('');
  };

  const isEmpty = messages.length === 0;
  const hasPortfolio = holdings.length > 0;
  const suggestedQuestions = hasPortfolio ? PORTFOLIO_QUESTIONS : GENERIC_QUESTIONS;

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 'min(420px, calc(100vw - 2rem))',
            height: 'min(580px, calc(100dvh - 6rem))',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: '#0071E3' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-primary leading-none">Investment Advisor</p>
                <p className="text-[10px] mt-0.5" style={{ color: hasPortfolio ? '#0071E3' : 'var(--color-secondary)' }}>
                  {hasPortfolio ? `Portfolio-aware · ${holdings.length} holdings` : 'Ask any investment question'}
                  {' · '}
                  <span style={{ color: 'var(--color-secondary)' }}>{lang === 'zh-TW' ? '繁中' : 'EN'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                disabled={streaming}
                className="text-xs rounded-lg px-2 py-1 outline-none"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  color: 'var(--color-secondary)',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  title="Clear chat"
                  className="p-1 rounded-lg hover:bg-surface-secondary transition-colors"
                  style={{ color: 'var(--color-secondary)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="p-1 rounded-lg hover:bg-surface-secondary transition-colors"
                style={{ color: 'var(--color-secondary)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto thin-scroll p-4 space-y-4">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#0071E3' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-primary mb-1">Investment Advisor</p>
                  <p className="text-xs text-secondary max-w-[240px]">
                    {hasPortfolio
                      ? 'Ask me anything — I have full context of your portfolio, holdings, and today\'s market.'
                      : 'Ask me anything about investing, markets, portfolio strategy, or financial concepts.'}
                  </p>
                </div>
                {hasPortfolio && (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium"
                    style={{ backgroundColor: 'rgba(0,113,227,0.08)', color: '#0071E3' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                    </svg>
                    {holdings.length} holdings · portfolio context loaded
                  </div>
                )}
                <div className="w-full space-y-2 mt-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="w-full text-left text-xs px-3 py-2 rounded-xl transition-colors"
                      style={{
                        backgroundColor: 'var(--color-surface-secondary)',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div
                      className="max-w-[80%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm"
                      style={{ backgroundColor: '#0071E3', color: '#fff' }}
                    >
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[92%] space-y-0.5">
                      {msg.content ? (
                        <>
                          {renderMarkdown(msg.content)}
                          {streaming && i === messages.length - 1 && (
                            <span className="inline-block w-0.5 h-4 bg-accent animate-pulse ml-0.5 align-middle" />
                          )}
                        </>
                      ) : (
                        <div className="flex gap-1 items-center py-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div
            className="shrink-0 p-3"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{
                backgroundColor: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask an investment question…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none bg-transparent outline-none text-sm text-primary placeholder:text-secondary min-h-[24px] max-h-[96px]"
                style={{ lineHeight: '1.5' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
                }}
              />
              {streaming ? (
                <button
                  onClick={handleStop}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ backgroundColor: 'var(--color-loss)', color: '#fff' }}
                  title="Stop"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1" y="1" width="8" height="8" rx="1" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                  style={{ backgroundColor: '#0071E3', color: '#fff' }}
                  title="Send (Enter)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[10px] text-secondary text-center mt-1.5">Enter to send · Shift+Enter for newline</p>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-4 sm:right-6 z-50 w-13 h-13 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
        style={{
          width: '52px',
          height: '52px',
          backgroundColor: open ? 'var(--color-primary)' : '#0071E3',
          color: '#fff',
        }}
        aria-label={open ? 'Close investment advisor' : 'Open investment advisor'}
        title={open ? 'Close' : 'Ask an investment question'}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
        )}
      </button>
    </>
  );
}
