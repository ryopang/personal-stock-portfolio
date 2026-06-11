'use client';

import { useState } from 'react';
import { formatCurrencyK } from '@/lib/formatters';
import { fmtMoney, fmtMoneyFull, fmtPct } from './shared';

export const COLORS = [
  '#0071E3', '#34C759', '#FF9500', '#AF52DE', '#FF3B30',
  '#5AC8FA', '#FFCC00', '#FF2D55', '#32ADE6', '#30D158',
];

export interface Slice {
  industry: string;
  count: number;
  value: number;
  percent: number;
  dailyChange: number;
  dailyChangePct: number;
  totalGain: number;
  totalGainPct: number;
  totalCost: number;
  color: string;
  startAngle: number;
  endAngle: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number, outerR: number, innerR: number,
  startAngle: number, endAngle: number,
) {
  const delta = endAngle - startAngle;
  const end = delta >= 360 ? startAngle + 359.999 : endAngle;
  const large = end - startAngle > 180 ? 1 : 0;
  const oS = polarToCartesian(cx, cy, outerR, startAngle);
  const oE = polarToCartesian(cx, cy, outerR, end);
  const iS = polarToCartesian(cx, cy, innerR, startAngle);
  const iE = polarToCartesian(cx, cy, innerR, end);
  return `M${oS.x},${oS.y} A${outerR},${outerR} 0 ${large} 1 ${oE.x},${oE.y} L${iE.x},${iE.y} A${innerR},${innerR} 0 ${large} 0 ${iS.x},${iS.y} Z`;
}

interface DonutChartProps {
  slices: Slice[];
  isPrivate: boolean;
  selectedIndustries: Set<string>;
  onToggleIndustry: (industry: string) => void;
  onClearIndustries: () => void;
}

export function DonutChart({ slices, isPrivate, selectedIndustries, onToggleIndustry, onClearIndustries }: DonutChartProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cx = 180, cy = 180, outerR = 150, innerR = 87;
  const hoveredSlice = slices.find(s => s.industry === hovered);

  return (
    <div className="card p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wide">
          Industry Distribution
        </h2>
        {selectedIndustries.size > 0 && (
          <button
            onClick={onClearIndustries}
            className="text-xs font-medium px-2.5 py-1 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              color: 'var(--color-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">

        {/* Donut SVG */}
        <div className="shrink-0 w-full max-w-[280px] md:w-[324px]">
          <svg width="100%" viewBox="0 0 360 360" style={{ display: 'block' }}>
            <defs>
              <filter id="privacy-blur-donut" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
            </defs>
            {slices.map((slice) => {
              const selected = selectedIndustries.has(slice.industry);
              return (
                <path
                  key={slice.industry}
                  d={donutSlicePath(cx, cy, outerR, innerR, slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  opacity={hovered === null || hovered === slice.industry ? 1 : 0.2}
                  stroke={selected ? '#fff' : 'none'}
                  strokeWidth={selected ? 2.5 : 0}
                  style={{ transition: 'opacity 0.15s', cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(slice.industry)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onToggleIndustry(slice.industry)}
                />
              );
            })}
            {hoveredSlice ? (
              <>
                <text x={cx} y={cy - 15} textAnchor="middle" fontSize={14} style={{ fill: 'var(--color-secondary)' }}>{hoveredSlice.industry}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize={24} fontWeight="700" style={{ fill: 'var(--color-primary)' }}>{hoveredSlice.percent.toFixed(1)}%</text>
                <text x={cx} y={cy + 32} textAnchor="middle" fontSize={14}
                  filter={isPrivate ? 'url(#privacy-blur-donut)' : undefined}
                  style={{ fill: 'var(--color-secondary)' }}
                >{formatCurrencyK(hoveredSlice.value)}</text>
              </>
            ) : (
              <>
                <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={14} style={{ fill: 'var(--color-secondary)' }}>Industries</text>
                <text x={cx} y={cy + 20} textAnchor="middle" fontSize={30} fontWeight="700" style={{ fill: 'var(--color-primary)' }}>{slices.length}</text>
              </>
            )}
          </svg>
        </div>

        {/* Legend table */}
        <div className="flex-1 min-w-0 w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th className="text-left pb-2 pr-2 md:pr-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Industry</th>
                <th className="hidden sm:table-cell text-center pb-2 px-2 md:px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Cost</th>
                <th className="text-center pb-2 px-2 md:px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Value</th>
                <th className="text-center pb-2 px-2 md:px-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Daily</th>
                <th className="text-center pb-2 pl-2 md:pl-4 text-xs font-semibold text-secondary uppercase tracking-wide whitespace-nowrap">Total G/L</th>
              </tr>
            </thead>
            <tbody>
              {slices.map((slice) => {
                const dimmed = hovered !== null && hovered !== slice.industry;
                const dailyColor = slice.dailyChange >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';
                const gainColor  = slice.totalGain  >= 0 ? 'var(--color-gain)' : 'var(--color-loss)';
                return (
                  <tr
                    key={slice.industry}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      opacity: dimmed ? 0.3 : 1,
                      transition: 'opacity 0.15s',
                      cursor: 'pointer',
                      backgroundColor: selectedIndustries.has(slice.industry)
                        ? slice.color + '18'
                        : hovered === slice.industry ? 'var(--color-surface-secondary)' : 'transparent',
                    }}
                    onMouseEnter={() => setHovered(slice.industry)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => onToggleIndustry(slice.industry)}
                  >
                    <td className="py-1.5 pr-2 md:pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="text-xs md:text-sm font-medium text-primary">{slice.industry}</span>
                        <span className="text-[10px] md:text-xs font-semibold tabular-nums" style={{ color: slice.color }}>{slice.percent.toFixed(1)}%</span>
                        <span
                          className="text-[10px] md:text-xs font-semibold tabular-nums px-1 md:px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: slice.color + '22', color: slice.color }}
                        >{slice.count}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell py-1.5 px-2 md:px-4 text-center tabular-nums text-xs md:text-sm font-semibold text-primary whitespace-nowrap">
                      {formatCurrencyK(slice.totalCost)}
                    </td>
                    <td className="py-1.5 px-2 md:px-4 text-center tabular-nums text-xs md:text-sm font-semibold text-primary whitespace-nowrap">
                      {formatCurrencyK(slice.value)}
                    </td>
                    <td className="py-1.5 px-2 md:px-4 text-center whitespace-nowrap" style={{ color: dailyColor }}>
                      <div className="tabular-nums text-xs md:text-sm font-semibold">{fmtMoneyFull(slice.dailyChange)}</div>
                      <div className="tabular-nums text-[10px] md:text-xs opacity-75">{fmtPct(slice.dailyChangePct)}</div>
                    </td>
                    <td className="py-1.5 pl-2 md:pl-4 text-center whitespace-nowrap" style={{ color: gainColor }}>
                      <div className="tabular-nums text-xs md:text-sm font-semibold">{fmtMoney(slice.totalGain)}</div>
                      <div className="tabular-nums text-[10px] md:text-xs opacity-75">{fmtPct(slice.totalGainPct)}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
