'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface ShowFiltersProps {
  cities: string[];
}

export function ShowFilters({ cities }: ShowFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCity = searchParams.get('city') ?? 'all';
  const currentAvailability = searchParams.get('availability') ?? 'all';
  const currentSort = searchParams.get('sort') ?? 'starts_at';

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all' || value === 'starts_at') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete('page'); // Reset page on filter change
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams],
  );

  const selectClass =
    'appearance-none bg-white border border-charcoal/10 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-charcoal hover:border-charcoal/20 focus:border-amber focus:ring-2 focus:ring-amber/20 transition-colors cursor-pointer';

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* City filter */}
      <div className="relative">
        <label htmlFor="city-filter" className="sr-only">
          Filter by city
        </label>
        <select
          id="city-filter"
          value={currentCity}
          onChange={(e) => updateFilter('city', e.target.value)}
          className={selectClass}
        >
          <option value="all">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <ChevronDown />
      </div>

      {/* Availability filter */}
      <div className="relative">
        <label htmlFor="availability-filter" className="sr-only">
          Filter by availability
        </label>
        <select
          id="availability-filter"
          value={currentAvailability}
          onChange={(e) => updateFilter('availability', e.target.value)}
          className={selectClass}
        >
          <option value="all">All Availability</option>
          <option value="available">Available</option>
          <option value="temporarily_unavailable">Temporarily Held</option>
          <option value="sold_out">Sold Out</option>
        </select>
        <ChevronDown />
      </div>

      {/* Sort */}
      <div className="relative">
        <label htmlFor="sort-filter" className="sr-only">
          Sort shows
        </label>
        <select
          id="sort-filter"
          value={currentSort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className={selectClass}
        >
          <option value="starts_at">Soonest</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
        <ChevronDown />
      </div>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg
      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate pointer-events-none"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
