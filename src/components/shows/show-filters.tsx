'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronDown, IconClose, IconPin, IconSearch } from '@/components/ui/icons';
import type { Venue } from '@/types/domain';

interface ShowFiltersProps {
  venues: Venue[];
}

const AVAILABILITY = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'temporarily_unavailable', label: 'Held' },
  { value: 'sold_out', label: 'Sold out' },
] as const;

const SORT_OPTIONS = [
  { value: 'starts_at', label: 'Soonest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
] as const;

const SEARCH_DEBOUNCE_MS = 350;

export function ShowFilters({ venues }: ShowFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get('q') ?? '';
  const currentCity = searchParams.get('city') ?? 'all';
  const currentVenue = searchParams.get('venue') ?? '';
  const currentAvailability = searchParams.get('availability') ?? 'all';
  const currentSort = searchParams.get('sort') ?? 'starts_at';

  const [query, setQuery] = useState(currentQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(currentQuery);
  if (currentQuery !== prevUrlQuery) {
    setPrevUrlQuery(currentQuery);
    setQuery(currentQuery);
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParamsRef = useRef(searchParams);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const cities = useMemo(
    () => [...new Set(venues.map((v) => v.city))].sort((a, b) => a.localeCompare(b)),
    [venues],
  );

  const sortedVenues = useMemo(
    () => [...venues].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name)),
    [venues],
  );

  const selectedVenue = venues.find((v) => v.id === currentVenue);
  const locationValue = currentVenue
    ? `venue:${currentVenue}`
    : currentCity !== 'all'
      ? `city:${currentCity}`
      : 'all';

  const hasFilters =
    currentQuery.trim() !== '' ||
    currentCity !== 'all' ||
    Boolean(currentVenue) ||
    currentAvailability !== 'all' ||
    currentSort !== 'starts_at';

  const pushParams = useCallback(
    (params: URLSearchParams) => {
      params.delete('page');
      const queryString = params.toString();
      router.push(queryString ? `/?${queryString}` : '/', { scroll: false });
    },
    [router],
  );

  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      for (const [key, value] of Object.entries(updates)) {
        const empty =
          !value ||
          value === 'all' ||
          (key === 'sort' && value === 'starts_at') ||
          (key === 'q' && value.trim() === '');
        if (empty) params.delete(key);
        else params.set(key, key === 'q' ? value.trim() : value);
      }
      pushParams(params);
    },
    [pushParams],
  );

  const scheduleQuery = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateFilters({ q: value });
      }, SEARCH_DEBOUNCE_MS);
    },
    [updateFilters],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const flushQuery = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateFilters({ q: query });
  }, [query, updateFilters]);

  const clearFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery('');
    router.push('/', { scroll: false });
  };

  const onLocationChange = (value: string) => {
    if (value === 'all') {
      updateFilters({ city: null, venue: null });
      return;
    }
    if (value.startsWith('city:')) {
      updateFilters({ city: value.slice(5), venue: null });
      return;
    }
    if (value.startsWith('venue:')) {
      updateFilters({ venue: value.slice(6), city: null });
    }
  };

  const fieldClass =
    'appearance-none w-full bg-white border border-charcoal/10 rounded-xl px-3.5 py-2.5 text-sm font-medium text-charcoal shadow-sm hover:border-charcoal/20 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20 transition-colors';

  return (
    <div className="space-y-4">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          flushQuery();
        }}
      >
        <label htmlFor="show-search" className="sr-only">
          Search shows by name
        </label>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <input
            id="show-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scheduleQuery(e.target.value);
            }}
            placeholder="Search by show name"
            autoComplete="off"
            maxLength={80}
            className={`${fieldClass} pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                if (debounceRef.current) clearTimeout(debounceRef.current);
                updateFilters({ q: null });
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate hover:bg-charcoal/5 hover:text-charcoal cursor-pointer"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-0 lg:flex-1">
          <div className="relative min-w-0">
            <label
              htmlFor="location-filter"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate"
            >
              Location
            </label>
            <IconPin className="pointer-events-none absolute left-3.5 bottom-3 h-4 w-4 text-slate" />
            <select
              id="location-filter"
              value={locationValue}
              onChange={(e) => onLocationChange(e.target.value)}
              className={`${fieldClass} cursor-pointer pl-10 pr-9`}
            >
              <option value="all">All locations</option>
              <optgroup label="Cities">
                {cities.map((city) => (
                  <option key={city} value={`city:${city}`}>
                    {city}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Venues">
                {sortedVenues.map((venue) => (
                  <option key={venue.id} value={`venue:${venue.id}`}>
                    {venue.name} · {venue.city}
                  </option>
                ))}
              </optgroup>
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-slate" />
          </div>

          <div className="relative min-w-0">
            <label
              htmlFor="sort-filter"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate"
            >
              Sort
            </label>
            <select
              id="sort-filter"
              value={currentSort}
              onChange={(e) => updateFilters({ sort: e.target.value })}
              className={`${fieldClass} cursor-pointer pr-9`}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-slate" />
          </div>
        </div>

        <div className="lg:pb-px">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate">
            Availability
          </p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Availability">
            {AVAILABILITY.map((option) => {
              const active = currentAvailability === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFilters({ availability: option.value })}
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
        </div>
      </div>

      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t border-charcoal/6 pt-3">
          {currentQuery.trim() && (
            <FilterChip
              label={`“${currentQuery.trim()}”`}
              onRemove={() => {
                setQuery('');
                if (debounceRef.current) clearTimeout(debounceRef.current);
                updateFilters({ q: null });
              }}
            />
          )}
          {selectedVenue && (
            <FilterChip
              label={`${selectedVenue.name}, ${selectedVenue.city}`}
              onRemove={() => updateFilters({ venue: null, city: null })}
            />
          )}
          {!selectedVenue && currentCity !== 'all' && (
            <FilterChip label={currentCity} onRemove={() => updateFilters({ city: null })} />
          )}
          {currentAvailability !== 'all' && (
            <FilterChip
              label={
                AVAILABILITY.find((option) => option.value === currentAvailability)?.label ??
                currentAvailability
              }
              onRemove={() => updateFilters({ availability: null })}
            />
          )}
          {currentSort !== 'starts_at' && (
            <FilterChip
              label={
                SORT_OPTIONS.find((option) => option.value === currentSort)?.label ?? currentSort
              }
              onRemove={() => updateFilters({ sort: null })}
            />
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto text-sm font-medium text-slate underline-offset-4 hover:text-charcoal hover:underline cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-charcoal/6 py-1 pl-3 pr-2 text-sm text-charcoal transition-colors hover:bg-charcoal/10 cursor-pointer"
    >
      <span className="truncate">{label}</span>
      <IconClose className="h-3 w-3 shrink-0 text-slate" />
      <span className="sr-only">Remove filter</span>
    </button>
  );
}
