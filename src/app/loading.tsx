import { ShowGridSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="page-wrap py-8 sm:py-12">
      <div className="mb-10 space-y-3">
        <div className="skeleton h-4 w-28 rounded-lg" />
        <div className="skeleton h-12 w-64 rounded-lg" />
        <div className="skeleton h-5 w-96 max-w-full rounded-lg" />
      </div>
      <ShowGridSkeleton count={6} />
    </div>
  );
}
