'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const ticketsSold = shows.reduce((sum, show) => sum + show.availability.sold, 0);
  const revenue = bookings.reduce((sum, booking) => sum + booking.total_minor, 0);

  return (
    <div>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Shows" value={String(shows.length)} />
        <StatCard label="Tickets booked" value={String(ticketsSold)} />
        <StatCard label="Booking total" value={formatPrice(revenue)} />
      </div>

      <div className="mb-6 flex w-fit gap-1 rounded-full bg-cream-dark p-1">
        <button
          type="button"
          onClick={() => setTab('shows')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
            tab === 'shows' ? 'bg-white text-charcoal shadow-sm' : 'text-slate hover:text-charcoal'
          }`}
        >
          Your shows ({shows.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('bookings')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-charcoal/8 bg-white px-5 py-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-charcoal">{value}</p>
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
          <Link href="/organiser/shows/new">
            <Button>Create a show</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {shows.map((show) => {
        const venue = show.venues;
        const fill =
          show.availability.capacity > 0
            ? Math.round((show.availability.sold * 100) / show.availability.capacity)
            : 0;
        return (
          <div
            key={show.id}
            className="rounded-2xl border border-charcoal/8 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <h3 className="font-display text-lg font-bold text-charcoal">{show.title}</h3>
                <p className="mt-1 text-sm text-slate">
                  {venue.name} · {formatShowTime(show.starts_at, venue.timezone)}
                </p>
                <div className="mt-3 max-w-xs">
                  <div className="mb-1 flex justify-between text-xs text-slate">
                    <span>
                      <span className="font-semibold text-charcoal">{show.availability.sold}</span>{' '}
                      / {show.availability.capacity} booked
                    </span>
                    <span>{fill}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-cream-dark">
                    <div
                      className="h-full rounded-full bg-amber"
                      style={{ width: `${Math.min(fill, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={show.status === 'active' ? 'success' : 'info'} dot>
                  {show.status}
                </Badge>
                <Link href={`/organiser/shows/${show.id}/edit`}>
                  <Button variant="secondary" size="sm">
                    Edit
                  </Button>
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
          className="flex flex-col justify-between gap-3 rounded-2xl border border-charcoal/8 bg-white p-5 shadow-card sm:flex-row sm:items-center"
        >
          <div>
            <p className="font-mono text-sm font-bold tracking-wider text-amber-dark">
              {b.reference}
            </p>
            <p className="mt-0.5 text-sm font-medium text-charcoal">{b.shows.title}</p>
            <p className="text-xs text-slate">
              {b.customer_name || 'Anonymous'} ·{' '}
              {formatInTimeZone(b.created_at, b.shows.venues.timezone)}
            </p>
          </div>
          <p className="text-lg font-bold tabular-nums text-charcoal">
            {formatPrice(b.total_minor)}
          </p>
        </div>
      ))}
    </div>
  );
}
