import { Suspense } from 'react';
import Link from 'next/link';
import { getShows, getVenues } from '@/server/repositories/shows';
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
  const venues = await getVenues();

  const filters: ShowFiltersType = {
    q: typeof params.q === 'string' ? params.q : undefined,
    city: typeof params.city === 'string' ? params.city : undefined,
    venue: typeof params.venue === 'string' ? params.venue : undefined,
    availability:
      typeof params.availability === 'string'
        ? (params.availability as ShowFiltersType['availability'])
        : undefined,
    sort: typeof params.sort === 'string' ? (params.sort as ShowFiltersType['sort']) : 'starts_at',
    page: typeof params.page === 'string' ? parseInt(params.page, 10) : 1,
  };

  const hasFilters = Boolean(
    filters.q?.trim() ||
    (filters.city && filters.city !== 'all') ||
    filters.venue ||
    (filters.availability && filters.availability !== 'all') ||
    (filters.sort && filters.sort !== 'starts_at'),
  );

  return (
    <div>
      <section className="relative overflow-hidden border-b border-charcoal/6">
        <div className="page-wrap py-12 sm:py-16">
          <p className="kicker mb-4">Festival 2026</p>
          <h1 className="font-display max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-charcoal sm:text-5xl lg:text-6xl">
            What&apos;s On
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate">
            Discover independent theatre, dance, and performance. Hold seats in seconds, show your
            QR at the door.
          </p>
        </div>
      </section>

      <div className="page-wrap py-8 sm:py-10">
        <div className="mb-8">
          <Suspense fallback={null}>
            <ShowFilters venues={venues} />
          </Suspense>
        </div>

        <Suspense fallback={<ShowGridSkeleton />}>
          <ShowGrid filters={filters} hasFilters={hasFilters} />
        </Suspense>
      </div>
    </div>
  );
}

async function ShowGrid({
  filters,
  hasFilters,
}: {
  filters: ShowFiltersType;
  hasFilters: boolean;
}) {
  const result = await getShows(filters);

  if (result.data.length === 0) {
    return (
      <EmptyState
        title="No shows match your filters"
        description="Try another name, city, or venue — or clear your filters and browse everything that's on."
        action={
          hasFilters ? (
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-xl bg-charcoal px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-ink"
            >
              Clear filters
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <p className="mb-5 text-sm text-slate">
        <span className="font-semibold text-charcoal">{result.total}</span>{' '}
        {result.total === 1 ? 'show' : 'shows'}
        {hasFilters ? ' match your filters' : ''}
      </p>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {result.data.map((show, index) => (
          <div
            key={show.id}
            className="animate-slide-up"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          >
            <ShowCard show={show} />
          </div>
        ))}
      </div>

      <Suspense fallback={null}>
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} />
      </Suspense>
    </>
  );
}
