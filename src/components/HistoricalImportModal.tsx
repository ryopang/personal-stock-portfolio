'use client';

import { useEffect, useRef, useState } from 'react';
import type { DailySnapshot } from '@/lib/types';

interface Props {
  onClose: () => void;
  onImportComplete: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

interface ParsedRow {
  date: string;
  totalGain: number;
  returnPct: number;
  totalCost: number;
  totalValue: number;
  error?: string;
}

function parseAmount(val: string): number {
  return parseFloat(val.replace(/[$,\s]/g, ''));
}

function colIndex(headers: string[], keyword: string): number {
  return headers.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
}

function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function parseCSV(text: string): ParsedRow[] {
  const rows = parseCSVText(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.replace(/^"|"$/g, ''));
  const dateIdx   = colIndex(headers, 'date');
  const gainIdx   = colIndex(headers, 'gain');
  const returnIdx = colIndex(headers, 'return');

  if (dateIdx === -1 || gainIdx === -1 || returnIdx === -1) {
    return [];
  }

  const blank = { totalGain: 0, returnPct: 0, totalCost: 0, totalValue: 0 };

  return rows.slice(1).map(cols => {
    const date      = (cols[dateIdx]   ?? '').replace(/^"|"$/g, '').trim();
    const rawGain   = (cols[gainIdx]   ?? '').replace(/^"|"$/g, '').trim();
    const rawReturn = (cols[returnIdx] ?? '').replace(/^"|"$/g, '').trim();

    if (!date || !rawGain || !rawReturn) {
      return { date: date || '(empty)', ...blank, error: 'Missing required fields' };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { date, ...blank, error: 'Date must be YYYY-MM-DD' };
    }

    // Strip $ and % before parsing
    const totalGain = parseAmount(rawGain);
    const returnPct = parseFloat(rawReturn.replace(/[%,\s]/g, ''));

    if (isNaN(totalGain) || isNaN(returnPct)) {
      return { date, ...blank, error: 'Invalid number format' };
    }

    if (returnPct === 0) {
      return { date, ...blank, error: 'Return % cannot be 0' };
    }

    const totalCost  = totalGain / (returnPct / 100);
    const totalValue = totalCost + totalGain;

    return { date, totalGain, returnPct, totalCost, totalValue };
  });
}

function fmt(v: number) {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function HistoricalImportModal({ onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [apiError, setApiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setParseError('Please upload a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setParseError('Could not parse CSV. Make sure it has date, totalGain, and returnPct (or return) columns.');
        return;
      }
      setParseError('');
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  const handleImport = async () => {
    setStep('importing');
    const snapshots: DailySnapshot[] = validRows.map(r => ({
      date: r.date,
      timestamp: new Date(r.date + 'T12:00:00').getTime(),
      totalValue: r.totalValue,
      totalCost: r.totalCost,
      totalGain: r.totalGain,
      byIndustry: {},
    }));

    try {
      const res = await fetch('/api/portfolio/snapshots/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setImportedCount(data.imported);
      setSkipped(data.skipped ?? []);
      setStep('done');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Import failed');
      setStep('preview');
    }
  };

  const handleClose = () => {
    if (step === 'done') onImportComplete();
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={step !== 'importing' ? handleClose : undefined}
    >
      <div
        className="card w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-semibold text-primary">Import Historical Data</h2>
            <p className="text-xs text-secondary mt-0.5">
              Upload a CSV with columns: <code className="font-mono bg-surface-secondary px-1 rounded">date, totalGain, returnPct</code>
            </p>
          </div>
          {step !== 'importing' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded text-secondary hover:text-primary hover:bg-surface-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Upload step ── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-xl p-10 text-center transition-colors"
                style={{ borderColor: dragging ? 'var(--color-accent)' : 'var(--color-border)' }}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <svg className="w-8 h-8 mx-auto mb-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm text-secondary mb-3">Drag & drop your CSV here, or</p>
                <button
                  className="btn-secondary text-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose file
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {parseError && (
                <p className="error-text text-sm">{parseError}</p>
              )}

              <div className="rounded-lg p-4 text-sm space-y-1" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                <p className="font-medium text-primary mb-2">Expected CSV format:</p>
                <pre className="font-mono text-xs text-secondary leading-relaxed">{`date,totalGain,returnPct\n2024-01-15,870000,85.23\n2024-01-16,865000,84.91`}</pre>
                <p className="text-xs text-secondary mt-2 opacity-70">totalValue and totalCost are derived automatically from totalGain ÷ returnPct</p>
              </div>
            </div>
          )}

          {/* ── Preview step ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary">
                  <span className="font-semibold text-primary">{validRows.length}</span> rows ready
                  {errorRows.length > 0 && (
                    <span className="text-loss ml-2">· {errorRows.length} will be skipped</span>
                  )}
                </span>
                <button
                  className="text-xs text-secondary hover:text-primary underline"
                  onClick={() => { setRows([]); setStep('upload'); setParseError(''); }}
                >
                  Choose different file
                </button>
              </div>

              {apiError && <p className="error-text text-sm">{apiError}</p>}

              <div className="rounded-lg overflow-hidden border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-secondary uppercase tracking-wide">Date</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-secondary uppercase tracking-wide">Total Gain</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-secondary uppercase tracking-wide">Return %</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-secondary uppercase tracking-wide">Total Value</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t border-border" style={{ opacity: row.error ? 0.5 : 1 }}>
                        <td className="py-1.5 px-3 font-mono text-xs text-primary">{row.date}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums" style={{ color: row.error ? undefined : 'var(--color-gain)' }}>{row.error ? '—' : fmt(row.totalGain)}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums" style={{ color: row.error ? undefined : 'var(--color-gain)' }}>{row.error ? '—' : `${row.returnPct >= 0 ? '+' : ''}${row.returnPct.toFixed(2)}%`}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-primary">{row.error ? '—' : fmt(row.totalValue)}</td>
                        <td className="py-1.5 px-3 text-right">
                          {row.error && (
                            <span className="text-xs text-loss">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Importing step ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <svg className="w-8 h-8 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm text-secondary">Importing {validRows.length} snapshots…</p>
            </div>
          )}

          {/* ── Done step ── */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#dcfce7' }}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium" style={{ color: '#15803d' }}>
                  Imported {importedCount} snapshot{importedCount !== 1 ? 's' : ''} successfully
                </p>
              </div>

              {skipped.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-secondary font-medium">Skipped ({skipped.length}):</p>
                  <ul className="text-xs text-secondary space-y-0.5">
                    {skipped.map(d => <li key={d} className="font-mono">{d}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'preview' || step === 'done') && (
          <div className="p-6 border-t border-border flex justify-end gap-3 shrink-0">
            {step === 'preview' && (
              <>
                <button className="btn-secondary" onClick={handleClose}>Cancel</button>
                <button
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={validRows.length === 0}
                >
                  Import {validRows.length} row{validRows.length !== 1 ? 's' : ''}
                </button>
              </>
            )}
            {step === 'done' && (
              <button className="btn-primary" onClick={handleClose}>Done</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
