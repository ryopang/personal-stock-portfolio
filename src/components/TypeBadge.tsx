import type { AssetType } from '@/lib/types';

const config: Record<AssetType, { label: string; className: string }> = {
  stock:  { label: 'Stock',  className: 'badge-stock' },
  etf:    { label: 'ETF',    className: 'badge-etf' },
  crypto: { label: 'Crypto', className: 'badge-crypto' },
};

export default function TypeBadge({ type }: { type: AssetType }) {
  const { label, className } = config[type];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${className}`}
    >
      {label}
    </span>
  );
}
