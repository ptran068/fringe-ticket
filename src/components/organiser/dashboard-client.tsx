'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPrice } from '@/domain/pricing';
import { formatInTimeZone, formatShowTime } from '@/domain/time';
import type { ShowWithAvailability } from '@/types/domain';

interface BookingRow {
  id: string;
  reference: string;
  customer_name: string | null;
  total_minor: number;
  created_at: string;
  shows: {
    title: string;
    venues: { timezone: string };
  };
}

interface OrganiserDashboardProps {
  shows: ShowWithAvailability[];
  bookings: BookingRow[];
}

export function OrganiserDashboard({ shows, bookings }: OrganiserDashboardProps) {
  const [tab, setTab] = useState<'shows' | 'bookings'>('shows');

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-cream-dark rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('shows')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            tab === 'shows' ? 'bg-white text-charcoal shadow-sm' : 'text-slate hover:text-charcoal'
          }`}
        >
          Your shows ({shows.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('bookings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            tab === 'bookings'
              ? 'bg-white text-charcoal shadow-sm'
              : 'text-slate hover:text-charcoal'
          }`}
        >
          Bookings ({bookings.length})
        </button>
      </div>

      {tab === 'shows' ? <ShowsList shows={shows} /> : <BookingsList bookings={bookings} />}
    </div>
  );
}

function ShowsList({ shows }: { shows: ShowWithAvailability[] }) {
  if (shows.length === 0) {
    return (
      <EmptyState
        title="No shows yet"
        description="Create your first show to get started."
        action={
          <Link
            href="/organiser/shows/new"
            className="inline-flex items-center justify-center bg-charcoal text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            Create a show
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {shows.map((show) => {
        const venue = show.venues;
        return (
          <div
            key={show.id}
            className="bg-white rounded-xl border border-charcoal/5 p-6 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-charcoal">
                  {show.title}
                </h3>
                <p className="text-sm text-slate">
                  {venue.name} · {formatShowTime(show.starts_at, venue.timezone)}
                </p>
                <p className="text-sm text-slate mt-1">
                  <span className="font-semibold text-charcoal">{show.availability.sold}</span> /{' '}
                  {show.availability.capacity} tickets booked
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={show.status === 'active' ? 'success' : 'info'} dot>
                  {show.status}
                </Badge>
                <Link
                  href={`/organiser/shows/${show.id}/edit`}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg border border-charcoal/10 hover:bg-cream-dark"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BookingsList({ bookings }: { bookings: BookingRow[] }) {
  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings yet"
        description="Bookings will appear here when customers confirm tickets."
      />
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="bg-white rounded-xl border border-charcoal/5 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <p className="font-mono text-sm font-bold text-amber-dark">{b.reference}</p>
            <p className="text-sm text-charcoal font-medium">{b.shows.title}</p>
            <p className="text-xs text-slate">
              {b.customer_name || 'Anonymous'} ·{' '}
              {formatInTimeZone(b.created_at, b.shows.venues.timezone)}
            </p>
          </div>
          <p className="text-lg font-bold text-charcoal">{formatPrice(b.total_minor)}</p>
        </div>
      ))}
    </div>
  );
}
