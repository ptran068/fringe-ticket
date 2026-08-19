import { Suspense } from 'react';
import { getShows, getCities } from '@/server/repositories/shows';
import { ShowCard } from '@/components/shows/show-card';
import { ShowFilters } from '@/components/shows/show-filters';
import { Pagination } from '@/components/shows/pagination';
import { ShowGridSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { ShowFilters as ShowFiltersType } from '@/types/domain';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const cities = await getCities();

  const filters: ShowFiltersType = {
    city: typeof params.city === 'string' ? params.city : undefined,
    availability: typeof params.availability === 'string'
      ? params.availability as ShowFiltersType['availability']
      : undefined,
    sort: typeof params.sort === 'string'
      ? params.sort as ShowFiltersType['sort']
      : 'starts_at',
    page: typeof params.page === 'string' ? parseInt(params.page, 10) : 1,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl font-bold text-charcoal leading-tight">
          What&apos;s On
        </h1>
        <p className="mt-2 text-lg text-slate max-w-lg">
          Discover independent theatre, dance, and performance across the festival.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <Suspense fallback={null}>
          <ShowFilters cities={cities} />
        </Suspense>
      </div>

      {/* Show Grid */}
      <Suspense fallback={<ShowGridSkeleton />}>
        <ShowGrid filters={filters} />
      </Suspense>
    </div>
  );
}

async function ShowGrid({ filters }: { filters: ShowFiltersType }) {
  const result = await getShows(filters);

  if (result.data.length === 0) {
    return (
      <EmptyState
        title="No shows match your filters"
        description="Try another city or availability filter, or check back later for new listings."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {result.data.map((show) => (
          <ShowCard key={show.id} show={show} />
        ))}
      </div>

      <Suspense fallback={null}>
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} />
      </Suspense>
    </>
  );
}
