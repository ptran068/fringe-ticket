'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconChevronDown, IconClose, IconSearch } from '@/components/ui/icons';
import type { Venue } from '@/types/domain';

interface ShowFiltersProps {
  venues: Venue[];
}

const AVAILABILITY = [
  { value: 'all', label: 'All availability' },
  { value: 'available', label: 'Available' },
  { value: 'temporarily_unavailable', label: 'Held' },
  { value: 'sold_out', label: 'Sold out' },
] as const;

const SORT_OPTIONS = [
  { value: 'starts_at', label: 'Soonest' },
  { value: 'price_asc', label: 'Lowest price' },
  { value: 'price_desc', label: 'Highest price' },
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
    'appearance-none w-full h-11 bg-white border border-charcoal/10 rounded-xl px-3.5 text-sm text-charcoal placeholder:text-slate-light hover:border-charcoal/20 focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20 transition-colors';

  const selectClass = `${fieldClass} cursor-pointer truncate pr-8`;

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <form
        role="search"
        className="min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          flushQuery();
        }}
      >
        <label htmlFor="show-search" className="sr-only">
          Filter by show name
        </label>
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-light" />
          <input
            id="show-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              scheduleQuery(e.target.value);
            }}
            placeholder="Filter by show name..."
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
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate hover:bg-charcoal/5 hover:text-charcoal cursor-pointer"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      <FilterSelect
        id="availability-filter"
        label="Availability"
        value={currentAvailability}
        muted={currentAvailability === 'all'}
        onChange={(value) => updateFilters({ availability: value })}
        widthClass="w-[9.75rem] sm:w-[11rem]"
        selectClass={selectClass}
      >
        {AVAILABILITY.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="location-filter"
        label="Location"
        value={locationValue}
        muted={locationValue === 'all'}
        onChange={onLocationChange}
        widthClass="w-[7.5rem] sm:w-[8.25rem]"
        selectClass={selectClass}
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
      </FilterSelect>

      <FilterSelect
        id="sort-filter"
        label="Sort"
        value={currentSort}
        muted={currentSort === 'starts_at'}
        onChange={(value) => updateFilters({ sort: value })}
        widthClass="w-[6.75rem] sm:w-[7.5rem]"
        selectClass={selectClass}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterSelect>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="shrink-0 px-1 text-sm font-medium text-slate hover:text-charcoal cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  muted,
  onChange,
  widthClass,
  selectClass,
  children,
}: {
  id: string;
  label: string;
  value: string;
  muted?: boolean;
  onChange: (value: string) => void;
  widthClass: string;
  selectClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative shrink-0 ${widthClass}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectClass} ${muted ? 'text-slate' : ''}`}
      >
        {children}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate" />
    </div>
  );
}
