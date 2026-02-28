import { formatChange, formatChangeWhole, formatPercent } from '@/lib/formatters';

interface Props {
  value: number;
  percent?: number;
  format?: 'currency' | 'percent' | 'both';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  noDecimals?: boolean;
}

export default function PriceChange({
  value,
  percent,
  format = 'both',
  size = 'md',
  className = '',
  noDecimals = false,
}: Props) {
  const fmt = noDecimals ? formatChangeWhole : formatChange;
  const isPositive = value >= 0;
  const isZero = value === 0;

  const colorClass = isZero
    ? 'text-secondary'
    : isPositive
    ? 'text-gain'
    : 'text-loss';

  const sizeClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <span
      className={`font-medium tabular-nums ${colorClass} ${sizeClass} ${className}`}
    >
      {format === 'currency' && fmt(value)}
      {format === 'percent' && percent != null && formatPercent(percent)}
      {format === 'both' && percent != null && (
        <>
          {fmt(value)}
          <span className="opacity-70 ml-1">({formatPercent(percent)})</span>
        </>
      )}
    </span>
  );
}
