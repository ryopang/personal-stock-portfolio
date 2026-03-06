'use client';

import { useState } from 'react';
import PriceChange from './PriceChange';
import { formatCurrency, formatCurrencyK, formatCurrencyWhole, formatQuantity } from '@/lib/formatters';
import type { HoldingWithMetrics } from '@/lib/types';

interface Props {
  holding: HoldingWithMetrics;
  onEdit: (holding: HoldingWithMetrics) => void;
  onDelete: (id: string) => void;
  isChild?: boolean;
}

interface GroupSummaryProps {
  lotCount: number;
  aggregate: HoldingWithMetrics;
  expanded: boolean;
  onToggle: () => void;
}

// Desktop table row
export function HoldingTableRow({ holding, onEdit, onDelete, isChild }: Props) {
  const [showActions, setShowActions] = useState(false);

  const rowBgClass = showActions
    ? 'row-bg-hover'
    : holding.dailyChange > 0
    ? 'row-bg-gain'
    : holding.dailyChange < 0
    ? 'row-bg-loss'
    : '';

  return (
    <tr
      className={`group border-b border-border last:border-0 transition-colors ${rowBgClass}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >

      {/* Symbol + Name + hover actions */}
      <td className="py-2 pl-3 pr-2">
        <div className="flex items-center justify-start gap-1.5">
          {/* Fixed-width icon slot */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {!isChild && holding.dailyChangePercent > 5 && (
              <span className="text-base leading-none select-none" title="Up >5% today">🔥</span>
            )}
            {!isChild && holding.dailyChangePercent < -5 && (
              <svg className="w-5 h-5 text-loss" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-label="Down >5% today">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
            )}
          </div>
          <span className={`font-semibold text-sm ${isChild ? 'text-secondary' : 'text-primary'}`}>{holding.symbol.replace(/-USD$/, '')}</span>
          <div className={`flex items-center gap-1 transition-opacity duration-150 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={() => onEdit(holding)}
              className="p-1 rounded text-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
              title="Edit"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(holding.id)}
              className="p-1 rounded text-tertiary hover:text-loss hover:bg-loss/10 transition-colors"
              title="Delete"
              style={{ touchAction: 'manipulation' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </td>

      {/* Current Price */}
      <td className="py-1.5 px-1.5 text-sm font-medium text-primary tabular-nums text-center">
        {holding.currentPrice >= 1000 ? formatCurrencyK(holding.currentPrice) : formatCurrency(holding.currentPrice)}
      </td>

      {/* Quantity */}
      <td className="py-1.5 px-1.5 text-sm text-secondary tabular-nums text-center">
        {formatQuantity(holding.quantity)}
      </td>

      {/* Avg Cost */}
      <td className="py-1.5 px-1.5 text-sm text-secondary tabular-nums text-center">
        {holding.costBasis >= 1000 ? formatCurrencyK(holding.costBasis) : formatCurrency(holding.costBasis)}
      </td>

      {/* Total Cost */}
      <td className="py-1.5 px-1.5 text-sm text-secondary tabular-nums text-center">
        {formatCurrencyK(holding.totalCost)}
      </td>

      {/* Market Value */}
      <td className="py-1.5 px-1.5 text-sm font-semibold text-primary tabular-nums text-center">
        {formatCurrencyK(holding.currentValue)}
      </td>

      {/* Daily Change */}
      <td className="py-1.5 px-1.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <PriceChange value={holding.dailyChange} format="currency" size="sm" noDecimals />
          <PriceChange value={holding.dailyChange} percent={holding.dailyChangePercent} format="percent" size="sm" className="opacity-70" />
        </div>
      </td>

      {/* Total Gain/Loss */}
      <td className="py-1.5 pl-1.5 pr-3 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <PriceChange value={holding.totalGain} format="currency" size="sm" noDecimals />
          <PriceChange value={holding.totalGain} percent={holding.totalGainPercent} format="percent" size="sm" className="opacity-70" />
        </div>
      </td>

      {/* 52-Week Range */}
      <td className="py-1.5 px-2 pr-3 text-center">
        {holding.fiftyTwoWeekLow != null && holding.fiftyTwoWeekHigh != null ? (() => {
          const range = holding.fiftyTwoWeekHigh - holding.fiftyTwoWeekLow;
          const rawPct = range > 0 ? ((holding.currentPrice - holding.fiftyTwoWeekLow) / range) * 100 : 50;
          const pct = Math.max(2, Math.min(98, rawPct));
          return (
            <div
              className="flex flex-col items-center gap-1"
              title={`52W Low: ${formatCurrency(holding.fiftyTwoWeekLow)}  ·  52W High: ${formatCurrency(holding.fiftyTwoWeekHigh)}  ·  ${rawPct.toFixed(1)}% of range`}
            >
              {/* Track + fill + marker */}
              <div className="relative w-16 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{
                    left: `calc(${pct}% - 5px)`,
                    backgroundColor: 'var(--color-accent)',
                    boxShadow: '0 0 0 2px var(--color-surface)',
                  }}
                />
              </div>
              {/* Low / High labels */}
              <div className="flex justify-between w-16">
                <span className="text-[9px] tabular-nums" style={{ color: 'var(--color-secondary)' }}>
                  {holding.fiftyTwoWeekLow >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekLow) : formatCurrencyWhole(holding.fiftyTwoWeekLow)}
                </span>
                <span className="text-[9px] tabular-nums" style={{ color: 'var(--color-secondary)' }}>
                  {holding.fiftyTwoWeekHigh >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekHigh) : formatCurrencyWhole(holding.fiftyTwoWeekHigh)}
                </span>
              </div>
            </div>
          );
        })() : (
          <span className="text-xs" style={{ color: 'var(--color-secondary)' }}>—</span>
        )}
      </td>
    </tr>
  );
}

// Desktop grouped summary row (collapsed state)
export function GroupSummaryTableRow({ lotCount, aggregate: holding, expanded, onToggle }: GroupSummaryProps) {
  const [showHover, setShowHover] = useState(false);

  const rowBgClass = showHover
    ? 'row-bg-hover'
    : holding.dailyChange > 0
    ? 'row-bg-gain'
    : holding.dailyChange < 0
    ? 'row-bg-loss'
    : '';

  return (
    <tr
      className={`group border-b border-border transition-colors cursor-pointer ${rowBgClass}`}
      onClick={onToggle}
      onMouseEnter={() => setShowHover(true)}
      onMouseLeave={() => setShowHover(false)}
    >
      {/* Symbol + lot count + expand toggle */}
      <td className="py-2 pl-3 pr-2">
        <div className="flex items-center justify-start gap-1.5">
          {/* Fixed-width icon slot */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            {holding.dailyChangePercent > 5 && (
              <span className="text-base leading-none select-none" title="Up >5% today">🔥</span>
            )}
            {holding.dailyChangePercent < -5 && (
              <svg className="w-5 h-5 text-loss" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-label="Down >5% today">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
            )}
          </div>
          <span className="font-semibold text-primary text-sm">{holding.symbol.replace(/-USD$/, '')}</span>
          <svg
            className="w-3 h-3 text-secondary shrink-0 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums leading-none"
            style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-secondary)' }}
          >
            {lotCount}
          </span>
        </div>
      </td>

      {/* Current Price */}
      <td className="py-1.5 px-1.5 text-sm font-medium text-primary tabular-nums text-center">
        {holding.currentPrice >= 1000 ? formatCurrencyK(holding.currentPrice) : formatCurrency(holding.currentPrice)}
      </td>

      {/* Quantity */}
      <td className="py-1.5 px-1.5 text-sm text-secondary tabular-nums text-center">
        {formatQuantity(holding.quantity)}
      </td>

      {/* Avg Cost */}
      <td className="py-1.5 px-1.5 text-sm text-secondary tabular-nums text-center">
        {holding.costBasis >= 1000 ? formatCurrencyK(holding.costBasis) : formatCurrency(holding.costBasis)}
      </td>

      {/* Total Cost */}
      <td className="py-1.5 px-1.5 text-sm text-secondary tabular-nums text-center">
        {formatCurrencyK(holding.totalCost)}
      </td>

      {/* Market Value */}
      <td className="py-1.5 px-1.5 text-sm font-semibold text-primary tabular-nums text-center">
        {formatCurrencyK(holding.currentValue)}
      </td>

      {/* Daily Change */}
      <td className="py-1.5 px-1.5 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <PriceChange value={holding.dailyChange} format="currency" size="sm" noDecimals />
          <PriceChange value={holding.dailyChange} percent={holding.dailyChangePercent} format="percent" size="sm" className="opacity-70" />
        </div>
      </td>

      {/* Total Gain/Loss */}
      <td className="py-1.5 pl-1.5 pr-3 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <PriceChange value={holding.totalGain} format="currency" size="sm" noDecimals />
          <PriceChange value={holding.totalGain} percent={holding.totalGainPercent} format="percent" size="sm" className="opacity-70" />
        </div>
      </td>

      {/* 52-Week Range */}
      <td className="py-1.5 px-2 pr-3 text-center">
        {holding.fiftyTwoWeekLow != null && holding.fiftyTwoWeekHigh != null ? (() => {
          const range = holding.fiftyTwoWeekHigh - holding.fiftyTwoWeekLow;
          const rawPct = range > 0 ? ((holding.currentPrice - holding.fiftyTwoWeekLow) / range) * 100 : 50;
          const pct = Math.max(2, Math.min(98, rawPct));
          return (
            <div className="flex flex-col items-center gap-1" title={`52W Low: ${formatCurrency(holding.fiftyTwoWeekLow)}  ·  52W High: ${formatCurrency(holding.fiftyTwoWeekHigh)}  ·  ${rawPct.toFixed(1)}% of range`}>
              <div className="relative w-16 h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ left: `calc(${pct}% - 5px)`, backgroundColor: 'var(--color-accent)', boxShadow: '0 0 0 2px var(--color-surface)' }} />
              </div>
              <div className="flex justify-between w-16">
                <span className="text-[9px] tabular-nums" style={{ color: 'var(--color-secondary)' }}>
                  {holding.fiftyTwoWeekLow >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekLow) : formatCurrencyWhole(holding.fiftyTwoWeekLow)}
                </span>
                <span className="text-[9px] tabular-nums" style={{ color: 'var(--color-secondary)' }}>
                  {holding.fiftyTwoWeekHigh >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekHigh) : formatCurrencyWhole(holding.fiftyTwoWeekHigh)}
                </span>
              </div>
            </div>
          );
        })() : (
          <span className="text-xs" style={{ color: 'var(--color-secondary)' }}>—</span>
        )}
      </td>
    </tr>
  );
}

// Mobile group summary card (collapsed state)
export function GroupCard({
  lotCount,
  aggregate: holding,
  expanded,
  onToggle,
}: GroupSummaryProps) {
  const cardBgClass = holding.dailyChange > 0
    ? 'row-bg-gain'
    : holding.dailyChange < 0
    ? 'row-bg-loss'
    : '';

  const range = holding.fiftyTwoWeekHigh != null && holding.fiftyTwoWeekLow != null
    ? holding.fiftyTwoWeekHigh - holding.fiftyTwoWeekLow
    : null;
  const rawPct = range != null && range > 0
    ? ((holding.currentPrice - holding.fiftyTwoWeekLow!) / range) * 100
    : null;
  const pct = rawPct != null ? Math.max(2, Math.min(98, rawPct)) : null;

  return (
    <button
      className={`w-full text-left card p-4 space-y-3 ${cardBgClass}`}
      onClick={onToggle}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Top row: symbol + lots badge + chevron */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {holding.dailyChangePercent > 5 && (
              <span className="text-base leading-none select-none" title="Up >5% today">🔥</span>
            )}
            {holding.dailyChangePercent < -5 && (
              <svg className="w-4 h-4 text-loss shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-label="Down >5% today">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
            )}
            <span className="font-bold text-primary">{holding.symbol.replace(/-USD$/, '')}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums leading-none"
              style={{ backgroundColor: 'var(--color-surface-secondary)', color: 'var(--color-secondary)' }}
            >
              {lotCount}
            </span>
          </div>
          {holding.industry && (
            <p className="text-xs text-secondary mt-0.5">{holding.industry}</p>
          )}
        </div>
        <svg
          className="w-4 h-4 text-secondary shrink-0 transition-transform mt-0.5"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Value + daily change row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-primary tabular-nums">
            {formatCurrencyK(holding.currentValue)}
          </p>
          <p className="text-xs text-secondary mt-0.5">
            {formatQuantity(holding.quantity)} × {holding.currentPrice >= 1000 ? formatCurrencyK(holding.currentPrice) : formatCurrency(holding.currentPrice)}
          </p>
        </div>
        <div className="text-right">
          <PriceChange
            value={holding.dailyChange}
            percent={holding.dailyChangePercent}
            format="both"
            size="sm"
          />
          <p className="text-xs text-secondary mt-0.5">Today</p>
        </div>
      </div>

      {/* Avg cost + total gain + 52W range */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="shrink-0">
          <p className="text-xs text-secondary">Avg cost</p>
          <p className="text-sm text-primary tabular-nums">
            {holding.costBasis >= 1000 ? formatCurrencyK(holding.costBasis) : formatCurrency(holding.costBasis)}
          </p>
        </div>
        <div className="flex items-center gap-6 min-w-0">
          <div className="text-right shrink-0">
            <p className="text-xs text-secondary">Total gain/loss</p>
            <PriceChange
              value={holding.totalGain}
              percent={holding.totalGainPercent}
              format="both"
              size="sm"
            />
          </div>
          {pct != null && rawPct != null && (
            <div className="w-16 shrink-0">
              <div className="mb-1.5">
                <span className="text-[10px] text-secondary">52W</span>
              </div>
              <div className="relative w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ left: `calc(${pct}% - 5px)`, backgroundColor: 'var(--color-accent)', boxShadow: '0 0 0 2px var(--color-surface)' }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] tabular-nums text-secondary">
                  {holding.fiftyTwoWeekLow! >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekLow!) : formatCurrencyWhole(holding.fiftyTwoWeekLow!)}
                </span>
                <span className="text-[9px] tabular-nums text-secondary">
                  {holding.fiftyTwoWeekHigh! >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekHigh!) : formatCurrencyWhole(holding.fiftyTwoWeekHigh!)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// Mobile card
export function HoldingCard({ holding, onEdit, onDelete }: Props) {
  const cardBgClass = holding.dailyChange > 0
    ? 'row-bg-gain'
    : holding.dailyChange < 0
    ? 'row-bg-loss'
    : '';

  return (
    <div className={`card p-4 space-y-3 ${cardBgClass}`}>
      {/* Top row: symbol + actions */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {holding.dailyChangePercent > 5 && (
              <span className="text-base leading-none select-none" title="Up >5% today">🔥</span>
            )}
            {holding.dailyChangePercent < -5 && (
              <svg className="w-4 h-4 text-loss shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-label="Down >5% today">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
              </svg>
            )}
            <span className="font-bold text-primary">{holding.symbol.replace(/-USD$/, '')}</span>
            {holding.industry && (
              <span className="text-xs text-secondary">{holding.industry}</span>
            )}
          </div>
          <p className="text-xs text-secondary mt-0.5 line-clamp-1">{holding.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(holding)}
            className="p-2.5 rounded-lg text-secondary hover:text-accent hover:bg-accent/10 active:bg-accent/20 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(holding.id)}
            className="p-2.5 rounded-lg text-secondary hover:text-loss hover:bg-loss/10 active:bg-loss/20 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Value + price row */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-primary tabular-nums">
            {formatCurrency(holding.currentValue)}
          </p>
          <p className="text-xs text-secondary mt-0.5 privacy-blur">
            {formatQuantity(holding.quantity)} × {formatCurrency(holding.currentPrice)}
          </p>
        </div>
        <div className="text-right">
          <PriceChange
            value={holding.dailyChange}
            percent={holding.dailyChangePercent}
            format="both"
            size="sm"
          />
          <p className="text-xs text-secondary mt-0.5">Today</p>
        </div>
      </div>

      {/* Cost basis + total gain + 52W range — all one row */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
        <div className="shrink-0">
          <p className="text-xs text-secondary">Avg cost</p>
          <p className="text-sm text-primary tabular-nums">{formatCurrency(holding.costBasis)}</p>
        </div>
        <div className="flex items-center gap-6 min-w-0">
          <div className="text-right shrink-0">
            <p className="text-xs text-secondary">Total gain/loss</p>
            <PriceChange
              value={holding.totalGain}
              percent={holding.totalGainPercent}
              format="both"
              size="sm"
            />
          </div>
          {holding.fiftyTwoWeekLow != null && holding.fiftyTwoWeekHigh != null && (() => {
            const range = holding.fiftyTwoWeekHigh - holding.fiftyTwoWeekLow;
            const rawPct = range > 0 ? ((holding.currentPrice - holding.fiftyTwoWeekLow) / range) * 100 : 50;
            const pct = Math.max(2, Math.min(98, rawPct));
            return (
              <div className="w-16 shrink-0">
                <div className="mb-1.5">
                  <span className="text-[10px] text-secondary">52W</span>
                </div>
                <div className="relative w-full h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: 'var(--color-accent)' }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                    style={{
                      left: `calc(${pct}% - 5px)`,
                      backgroundColor: 'var(--color-accent)',
                      boxShadow: '0 0 0 2px var(--color-surface)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] tabular-nums text-secondary">
                    {holding.fiftyTwoWeekLow >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekLow) : formatCurrencyWhole(holding.fiftyTwoWeekLow)}
                  </span>
                  <span className="text-[9px] tabular-nums text-secondary">
                    {holding.fiftyTwoWeekHigh >= 1000 ? formatCurrencyK(holding.fiftyTwoWeekHigh) : formatCurrencyWhole(holding.fiftyTwoWeekHigh)}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
