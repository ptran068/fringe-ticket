import { ShowGridSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-10 space-y-3">
        <div className="skeleton h-12 w-64 rounded-lg" />
        <div className="skeleton h-5 w-96 max-w-full rounded-lg" />
      </div>
      <ShowGridSkeleton count={6} />
    </div>
  );
}
