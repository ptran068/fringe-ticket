'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { IconChevronDown } from '@/components/ui/icons';

interface ShowFiltersProps {
  cities: string[];
}

const AVAILABILITY = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'temporarily_unavailable', label: 'Held' },
  { value: 'sold_out', label: 'Sold out' },
] as const;

export function ShowFilters({ cities }: ShowFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentCity = searchParams.get('city') ?? 'all';
  const currentAvailability = searchParams.get('availability') ?? 'all';
  const currentSort = searchParams.get('sort') ?? 'starts_at';
  const hasFilters =
    currentCity !== 'all' || currentAvailability !== 'all' || currentSort !== 'starts_at';

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all' || value === 'starts_at') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete('page');
      const query = params.toString();
      router.push(query ? `/?${query}` : '/');
    },
    [router, searchParams],
  );

  const clearFilters = () => router.push('/');

  const selectClass =
    'appearance-none w-full bg-white border border-charcoal/10 rounded-xl px-3.5 py-2.5 pr-9 text-sm font-medium text-charcoal shadow-sm hover:border-charcoal/20 focus:border-amber focus:ring-2 focus:ring-amber/20 transition-colors cursor-pointer';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Availability">
        {AVAILABILITY.map((option) => {
          const active = currentAvailability === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFilter('availability', option.value)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-charcoal text-white shadow-card'
                  : 'bg-white text-slate ring-1 ring-charcoal/10 hover:text-charcoal hover:ring-charcoal/20'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative min-w-0 flex-1 sm:max-w-56">
          <label
            htmlFor="city-filter"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate"
          >
            City
          </label>
          <select
            id="city-filter"
            value={currentCity}
            onChange={(e) => updateFilter('city', e.target.value)}
            className={selectClass}
          >
            <option value="all">All cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-slate" />
        </div>

        <div className="relative min-w-0 flex-1 sm:max-w-56">
          <label
            htmlFor="sort-filter"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate"
          >
            Sort
          </label>
          <select
            id="sort-filter"
            value={currentSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className={selectClass}
          >
            <option value="starts_at">Soonest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <IconChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-slate" />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-medium text-slate underline-offset-4 hover:text-charcoal hover:underline sm:mb-2.5 cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
