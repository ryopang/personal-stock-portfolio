'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import TypeBadge from './TypeBadge';
import type { SearchResult, AssetType } from '@/lib/types';

interface Props {
  value: string;
  onChange: (symbol: string, name: string, type: AssetType) => void;
  disabled?: boolean;
}

export default function SymbolSearch({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(result.symbol);
    setSelected(true);
    setIsOpen(false);
    setResults([]);
    onChange(result.symbol, result.name, result.type);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => !selected && query && setIsOpen(results.length > 0)}
          placeholder="Search symbol or name (e.g. AAPL, BTC)"
          disabled={disabled}
          className="input w-full pr-8"
          autoComplete="off"
          autoCapitalize="characters"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              className="w-4 h-4 text-tertiary animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
          {results.map((result) => (
            <button
              key={result.symbol}
              type="button"
              onMouseDown={() => handleSelect(result)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary active:bg-surface-secondary transition-colors text-left"
              style={{ touchAction: 'manipulation' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-primary text-sm">{result.symbol}</span>
                  <TypeBadge type={result.type} />
                </div>
                <p className="text-xs text-secondary truncate">{result.name}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
