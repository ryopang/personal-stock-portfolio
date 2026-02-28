const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdCompactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(n: number): string {
  return usdFormatter.format(n);
}

export function formatCurrencyCompact(n: number): string {
  return usdCompactFormatter.format(n);
}

export function formatCurrencyK(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    const s = (n / 1_000_000).toFixed(2);
    return `$${s.endsWith('.00') ? s.slice(0, -3) : s.endsWith('0') ? s.slice(0, -1) : s}M`;
  }
  const s = (n / 1000).toFixed(1);
  return `$${s.endsWith('.0') ? s.slice(0, -2) : s}K`;
}

export function formatChange(n: number): string {
  const formatted = usdFormatter.format(Math.abs(n));
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

const usdWholeFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatChangeWhole(n: number): string {
  const formatted = usdWholeFormatter.format(Math.abs(n));
  return n >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatCurrencyWhole(n: number): string {
  return usdWholeFormatter.format(n);
}

export function formatPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function formatPercentAbs(n: number): string {
  return `${Math.abs(n).toFixed(2)}%`;
}

// Handles fractional crypto quantities gracefully
export function formatQuantity(n: number): string {
  if (n % 1 === 0) return n.toLocaleString('en-US');
  // Show up to 8 significant decimal places, strip trailing zeros
  const str = n.toFixed(8).replace(/\.?0+$/, '');
  return str;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
