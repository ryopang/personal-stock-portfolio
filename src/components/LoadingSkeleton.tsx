export function SummarySkeleton() {
  return (
    <div className="card p-6 md:p-8 animate-pulse">
      <div className="h-4 w-32 bg-surface-secondary rounded mb-3" />
      <div className="h-10 w-48 bg-surface-secondary rounded mb-4" />
      <div className="flex gap-4">
        <div className="h-5 w-28 bg-surface-secondary rounded" />
        <div className="h-5 w-28 bg-surface-secondary rounded" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="p-4 border-b border-border">
        <div className="h-5 w-24 bg-surface-secondary rounded" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-4 border-b border-border last:border-0"
        >
          <div className="flex-1">
            <div className="h-4 w-16 bg-surface-secondary rounded mb-1.5" />
            <div className="h-3 w-24 bg-surface-secondary rounded" />
          </div>
          <div className="hidden md:block h-4 w-12 bg-surface-secondary rounded" />
          <div className="hidden md:block h-4 w-16 bg-surface-secondary rounded" />
          <div className="h-4 w-20 bg-surface-secondary rounded" />
          <div className="h-4 w-20 bg-surface-secondary rounded" />
        </div>
      ))}
    </div>
  );
}
