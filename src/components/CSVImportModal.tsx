'use client';

import { useState, useEffect, useRef } from 'react';
import { KNOWN_CRYPTO_SYMBOLS } from '@/lib/crypto-symbols';
import type { AssetType, Holding } from '@/lib/types';

interface Props {
  onClose: () => void;
  onImportComplete: (imported: Holding[]) => void;
}

interface ParsedRow {
  symbol: string;
  name: string;
  quantity: number;
  costBasis: number;
  type: AssetType;
  valid: boolean;
  parseError?: string;
}

interface ImportError {
  symbol: string;
  message: string;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

// --- CSV helpers ---

function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

function colIndex(headers: string[], keyword: string): number {
  return headers.findIndex((h) => h.toLowerCase().includes(keyword.toLowerCase()));
}

function parseAmount(val: string): number {
  return parseFloat(val.replace(/[$,\s]/g, ''));
}

function detectType(symbol: string): AssetType {
  return KNOWN_CRYPTO_SYMBOLS.has(symbol.toUpperCase()) ? 'crypto' : 'stock';
}

function parseCSV(text: string): ParsedRow[] {
  const all = parseCSVText(text);
  if (all.length < 2) return [];

  const headers = all[0].map((h) => h.replace(/^"|"$/g, ''));
  const symIdx = colIndex(headers, 'symbol');
  const descIdx = colIndex(headers, 'description');
  const qtyIdx = colIndex(headers, 'quantity');
  // Prefer "average cost basis" over "cost basis total"
  const avgCostIdx = headers.findIndex((h) =>
    h.toLowerCase().includes('average') && h.toLowerCase().includes('cost')
  );
  const costIdx = avgCostIdx !== -1 ? avgCostIdx : colIndex(headers, 'cost basis');

  if (symIdx === -1 || qtyIdx === -1 || costIdx === -1) {
    return [];
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < all.length; i++) {
    const cells = all[i];
    const raw = (idx: number) => (idx !== -1 && idx < cells.length ? cells[idx] : '');

    const symbol = raw(symIdx).replace(/^"|"$/g, '').toUpperCase().trim();
    if (!symbol) continue;

    const name = raw(descIdx).replace(/^"|"$/g, '').trim() || symbol;
    const qty = parseAmount(raw(qtyIdx));
    const cost = parseAmount(raw(costIdx));

    const valid = symbol.length > 0 && !isNaN(qty) && qty > 0 && !isNaN(cost) && cost > 0;
    const parseError = !valid
      ? !symbol ? 'Missing symbol'
        : isNaN(qty) || qty <= 0 ? 'Invalid quantity'
        : 'Invalid cost basis'
      : undefined;

    rows.push({
      symbol,
      name,
      quantity: isNaN(qty) ? 0 : qty,
      costBasis: isNaN(cost) ? 0 : cost,
      type: detectType(symbol),
      valid,
      parseError,
    });
  }
  return rows;
}

const today = new Date().toISOString().slice(0, 10);

export default function CSVImportModal({ onClose, onImportComplete }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [parseError, setParseError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [imported, setImported] = useState<Holding[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Please select a .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setParseError(
          'Could not find required columns (Symbol, Quantity, Average Cost Basis). ' +
          'Make sure the CSV has a header row.'
        );
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
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const updateRowType = (idx: number, type: AssetType) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, type } : r)));
  };

  const validRows = rows.filter((r) => r.valid);

  const handleImport = async () => {
    abortRef.current = false;
    setStep('importing');
    setProgress({ current: 0, total: validRows.length });
    setImportErrors([]);

    const successHoldings: Holding[] = [];
    const errs: ImportError[] = [];

    for (let i = 0; i < validRows.length; i++) {
      if (abortRef.current) break;
      const row = validRows[i];
      setProgress({ current: i + 1, total: validRows.length });
      try {
        const res = await fetch('/api/holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: row.symbol,
            name: row.name,
            type: row.type,
            quantity: row.quantity,
            costBasis: row.costBasis,
            purchaseDate,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          errs.push({ symbol: row.symbol, message: data.error ?? `HTTP ${res.status}` });
        } else {
          successHoldings.push(data.holding as Holding);
        }
      } catch {
        errs.push({ symbol: row.symbol, message: 'Network error' });
      }
    }

    setImported(successHoldings);
    setImportErrors(errs);
    setStep('done');
  };

  const handleClose = () => {
    if (step === 'done' && imported.length > 0) {
      onImportComplete(imported);
    } else {
      onClose();
    }
  };

  const isWide = step === 'preview';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 'importing' ? undefined : handleClose}
      />

      {/* Modal panel */}
      <div
        className={`relative w-full ${isWide ? 'sm:max-w-3xl' : 'sm:max-w-md'} bg-surface sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col transition-all`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-primary">Import from CSV</h2>
          {step !== 'importing' && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-surface-secondary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">

          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="px-5 py-6 space-y-4">
              <p className="text-sm text-secondary">
                Upload your brokerage CSV export. We&apos;ll detect{' '}
                <span className="font-medium text-primary">Symbol</span>,{' '}
                <span className="font-medium text-primary">Quantity</span>, and{' '}
                <span className="font-medium text-primary">Average Cost Basis</span> columns automatically.
              </p>

              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent hover:bg-surface-secondary'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <svg className="w-10 h-10 mx-auto mb-3 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-primary">Drop your CSV here</p>
                <p className="text-xs text-secondary mt-1">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {parseError && (
                <div className="rounded-lg bg-loss/10 border border-loss/20 px-4 py-3 text-sm text-loss">
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div className="flex flex-col">
              {/* Date picker bar */}
              <div className="px-5 py-4 border-b border-border bg-surface-secondary flex flex-wrap items-center gap-3">
                <label className="label shrink-0 mb-0">Purchase date for all holdings</label>
                <input
                  type="date"
                  value={purchaseDate}
                  max={today}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="input py-1.5 text-sm w-auto"
                />
              </div>

              {/* Invalid rows warning */}
              {rows.some((r) => !r.valid) && (
                <div className="mx-5 mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  {rows.filter((r) => !r.valid).length} row(s) have parse errors and will be skipped.
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto px-5 py-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-secondary border-b border-border">
                      <th className="pb-2 pr-3 font-medium">Symbol</th>
                      <th className="pb-2 pr-3 font-medium">Description</th>
                      <th className="pb-2 pr-3 font-medium">Type</th>
                      <th className="pb-2 pr-3 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Avg Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((row, i) => (
                      <tr key={i} className={row.valid ? '' : 'opacity-50'}>
                        <td className="py-2 pr-3">
                          <span className="font-mono font-semibold text-primary">{row.symbol}</span>
                          {!row.valid && (
                            <p className="text-xs text-loss mt-0.5">{row.parseError}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-secondary max-w-[180px] truncate" title={row.name}>
                          {row.name}
                        </td>
                        <td className="py-2 pr-3">
                          <select
                            value={row.type}
                            onChange={(e) => updateRowType(i, e.target.value as AssetType)}
                            disabled={!row.valid}
                            className="input py-1 text-xs w-24"
                          >
                            <option value="stock">Stock</option>
                            <option value="etf">ETF</option>
                            <option value="crypto">Crypto</option>
                          </select>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-primary">
                          {row.quantity.toLocaleString()}
                        </td>
                        <td className="py-2 text-right font-mono text-primary">
                          ${row.costBasis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP: Importing */}
          {step === 'importing' && (
            <div className="px-5 py-10 text-center space-y-5">
              <div className="w-12 h-12 mx-auto rounded-full bg-surface-secondary flex items-center justify-center">
                <svg className="w-6 h-6 text-accent animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  Importing {progress.current} of {progress.total}…
                </p>
                <p className="text-xs text-secondary mt-1">Validating symbols with Yahoo Finance</p>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-surface-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="px-5 py-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  importErrors.length === 0 ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {importErrors.length === 0 ? (
                    <svg className="w-5 h-5 text-gain" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {imported.length} holding{imported.length !== 1 ? 's' : ''} imported
                    {importErrors.length > 0 && `, ${importErrors.length} failed`}
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    {importErrors.length === 0
                      ? 'Your portfolio has been updated.'
                      : 'You can add failed symbols manually.'}
                  </p>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-3 py-2 bg-surface-secondary border-b border-border">
                    <p className="text-xs font-medium text-secondary">Failed imports</p>
                  </div>
                  <ul className="divide-y divide-border">
                    {importErrors.map((err) => (
                      <li key={err.symbol} className="px-3 py-2 flex items-start gap-2">
                        <span className="font-mono text-xs font-semibold text-primary mt-0.5 shrink-0">{err.symbol}</span>
                        <span className="text-xs text-secondary">{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="flex-1 btn-secondary">
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || !purchaseDate}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                Import {validRows.length} holding{validRows.length !== 1 ? 's' : ''}
              </button>
            </>
          )}

          {step === 'done' && (
            <button onClick={handleClose} className="flex-1 btn-primary">
              {imported.length > 0 ? 'View portfolio' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
