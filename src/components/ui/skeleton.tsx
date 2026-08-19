interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden="true" />;
}

export function ShowCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-charcoal/5 p-6 space-y-4 shadow-card">
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="flex justify-between items-end pt-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function ShowGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ShowCardSkeleton key={i} />
      ))}
    </div>
  );
}
