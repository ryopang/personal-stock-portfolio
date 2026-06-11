// Shared chart helpers used across two or more chart components.

export function sign(v: number) { return v >= 0 ? '+' : ''; }

export function fmtMoney(v: number) {
  const abs = Math.abs(v);
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`;
  return `${v < 0 ? '-' : '+'}${s}`;
}

export function fmtMoneyFull(v: number) {
  const abs = Math.abs(v);
  return `${v < 0 ? '-' : '+'}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(v: number) { return `${sign(v)}${v.toFixed(2)}%`; }

// Place x-axis labels at the calendar midpoint of each period (15th for months,
// July 1 for years), skipping periods whose midpoint falls outside the data range.
export function calendarMidpointIdxs(dates: string[], period: 'month' | 'year'): number[] {
  const sliceTo = period === 'year' ? 4 : 7;
  const midSuffix = period === 'year' ? '-07-01' : '-15';
  const unique = [...new Set(dates.map(d => d.slice(0, sliceTo)))];
  const first = dates[0].slice(0, 10);
  const last = dates[dates.length - 1].slice(0, 10);
  return unique
    .map(key => `${key}${midSuffix}`)
    .filter(mid => mid >= first && mid <= last)
    .map(mid => {
      let bestIdx = 0, bestDist = Infinity;
      dates.forEach((d, i) => {
        const dist = Math.abs(
          new Date(d.slice(0, 10) + 'T12:00:00').getTime() -
          new Date(mid + 'T12:00:00').getTime(),
        );
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      return bestIdx;
    });
}
