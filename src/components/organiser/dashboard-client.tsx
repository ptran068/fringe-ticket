'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatPrice } from '@/domain/pricing';
import { formatShowTime } from '@/domain/time';
import { getOrganiserShows, getOrganiserBookings } from '@/server/repositories/shows';
import type { ShowWithAvailability } from '@/types/domain';

interface Organiser {
  id: string;
  name: string;
  email: string;
}

interface OrganiserDashboardClientProps {
  organisers: Organiser[];
}

export function OrganiserDashboardClient({ organisers }: OrganiserDashboardClientProps) {
  const [selectedOrg, setSelectedOrg] = useState<string>(organisers[0]?.id ?? '');
  const [shows, setShows] = useState<ShowWithAvailability[]>([]);
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [tab, setTab] = useState<'shows' | 'bookings'>('shows');
  const [isPending, startTransition] = useTransition();
  const [loaded, setLoaded] = useState(false);

  const loadData = useCallback((orgId: string) => {
    startTransition(async () => {
      const [s, b] = await Promise.all([
        getOrganiserShows(orgId),
        getOrganiserBookings(orgId),
      ]);
      setShows(s);
      setBookings(b as Record<string, unknown>[]);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadData(selectedOrg);
    }
  }, [selectedOrg, loadData]);

  return (
    <div>
      {/* Organiser selector */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <label htmlFor="org-select" className="text-sm font-medium text-charcoal">
          Signed in as:
        </label>
        <select
          id="org-select"
          value={selectedOrg}
          onChange={(e) => setSelectedOrg(e.target.value)}
          className="appearance-none bg-white border border-charcoal/10 rounded-lg px-3 py-2 text-sm font-medium text-charcoal cursor-pointer"
        >
          {organisers.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-cream-dark rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('shows')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            tab === 'shows' ? 'bg-white text-charcoal shadow-sm' : 'text-slate hover:text-charcoal'
          }`}
        >
          Your Shows ({shows.length})
        </button>
        <button
          onClick={() => setTab('bookings')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
            tab === 'bookings' ? 'bg-white text-charcoal shadow-sm' : 'text-slate hover:text-charcoal'
          }`}
        >
          Bookings ({bookings.length})
        </button>
      </div>

      {(isPending || !loaded) ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-charcoal/5 p-6 skeleton h-24" />
          ))}
        </div>
      ) : tab === 'shows' ? (
        <ShowsList shows={shows} />
      ) : (
        <BookingsList bookings={bookings} />
      )}
    </div>
  );
}

function ShowsList({ shows }: { shows: ShowWithAvailability[] }) {
  if (shows.length === 0) {
    return <EmptyState title="No shows yet" description="Create your first show to get started." />;
  }

  return (
    <div className="space-y-4">
      {shows.map((show) => {
        const venue = show.venues;
        const booked = show.availability.sold;
        const capacity = show.availability.capacity;

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
                  <span className="font-semibold text-charcoal">{booked}</span> / {capacity} tickets booked
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={show.status === 'active' ? 'success' : 'info'} dot>
                  {show.status}
                </Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BookingsList({ bookings }: { bookings: Record<string, unknown>[] }) {
  if (bookings.length === 0) {
    return <EmptyState title="No bookings yet" description="Bookings will appear here when customers confirm tickets." />;
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const b = booking as {
          id: string;
          reference: string;
          customer_name: string;
          total_minor: number;
          created_at: string;
          shows: { title: string };
        };

        return (
          <div
            key={b.id}
            className="bg-white rounded-xl border border-charcoal/5 p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <p className="font-mono text-sm font-bold text-amber-dark">{b.reference}</p>
              <p className="text-sm text-charcoal font-medium">{b.shows.title}</p>
              <p className="text-xs text-slate">
                {b.customer_name || 'Anonymous'} · {new Date(b.created_at).toLocaleDateString()}
              </p>
            </div>
            <p className="text-lg font-bold text-charcoal">{formatPrice(b.total_minor)}</p>
          </div>
        );
      })}
    </div>
  );
}
