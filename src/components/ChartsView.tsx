'use client';

import { useMemo, useState, useEffect } from 'react';
import type { HoldingWithMetrics } from '@/lib/types';
import { DonutChart, COLORS, type Slice } from './charts/DonutChart';
import { TrendChart } from './charts/TrendChart';
import { StockPriceChart } from './charts/StockPriceChart';

interface Props { holdings: HoldingWithMetrics[]; }

export default function ChartsView({ holdings }: Props) {
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    const check = () => setIsPrivate(document.documentElement.classList.contains('privacy-mode'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const slices = useMemo((): Slice[] => {
    const map = new Map<string, { value: number; dailyChange: number; totalGain: number; totalCost: number; symbols: Set<string> }>();
    for (const h of holdings) {
      const key = h.industry?.trim() || 'Other';
      const p = map.get(key) ?? { value: 0, dailyChange: 0, totalGain: 0, totalCost: 0, symbols: new Set() };
      p.symbols.add(h.symbol);
      map.set(key, { value: p.value + h.currentValue, dailyChange: p.dailyChange + h.dailyChange, totalGain: p.totalGain + h.totalGain, totalCost: p.totalCost + h.totalCost, symbols: p.symbols });
    }
    const total = [...map.values()].reduce((s, v) => s + v.value, 0);
    const sorted = [...map.entries()].sort(([, a], [, b]) => b.value - a.value);
    let angle = 0;
    return sorted.map(([industry, d], i) => {
      const percent = (d.value / total) * 100;
      const sweep = (percent / 100) * 360;
      const s: Slice = {
        industry, percent, color: COLORS[i % COLORS.length],
        count: d.symbols.size,
        value: d.value, dailyChange: d.dailyChange,
        dailyChangePct: (d.value - d.dailyChange) > 0 ? (d.dailyChange / (d.value - d.dailyChange)) * 100 : 0,
        totalGain: d.totalGain,
        totalGainPct: d.totalCost > 0 ? (d.totalGain / d.totalCost) * 100 : 0,
        totalCost: d.totalCost,
        startAngle: angle, endAngle: angle + sweep,
      };
      // eslint-disable-next-line react-hooks/immutability
      angle += sweep;
      return s;
    });
  }, [holdings]);

  const industryColors = useMemo(
    () => new Map(slices.map(s => [s.industry, s.color])),
    [slices],
  );

  function toggleIndustry(industry: string) {
    setSelectedIndustries(prev => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(industry) ? next.delete(industry) : next.add(industry);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <DonutChart
        slices={slices}
        isPrivate={isPrivate}
        selectedIndustries={selectedIndustries}
        onToggleIndustry={toggleIndustry}
        onClearIndustries={() => setSelectedIndustries(new Set())}
      />
      <TrendChart industryColors={industryColors} enabled={selectedIndustries} />
      <StockPriceChart holdings={holdings} />
    </div>
  );
}
