import { cn } from '../lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shb-skeleton', className)} />;
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-3.5 w-16 ml-auto" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-50">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
