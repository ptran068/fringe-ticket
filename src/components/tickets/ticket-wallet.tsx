'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { TicketPass } from '@/components/tickets/ticket-pass';
import { Button } from '@/components/ui/button';
import { IconClock, IconPin } from '@/components/ui/icons';
import { formatPrice } from '@/domain/pricing';
import { encodeTicketQr } from '@/domain/ticket';
import { formatShowTime } from '@/domain/time';
import {
  getClientHydrationSnapshot,
  getServerHydrationSnapshot,
  getServerWalletSnapshot,
  getWalletSnapshot,
  isUpcomingTicket,
  removeWalletTicket,
  subscribeHydration,
  subscribeWallet,
  type WalletTicket,
} from '@/lib/ticket-wallet';
import {
  getPendingHoldSnapshot,
  getServerPendingHoldSnapshot,
  subscribePendingHold,
} from '@/lib/pending-hold';
import { PendingHoldCard } from '@/components/tickets/pending-hold-card';

function TicketCard({
  ticket,
  onRemove,
}: {
  ticket: WalletTicket;
  onRemove: (bookingId: string) => void;
}) {
  const payload = encodeTicketQr({
    origin: window.location.origin,
    bookingId: ticket.bookingId,
  });
  const upcoming = isUpcomingTicket(ticket);

  return (
    <article className="ticket-notch overflow-hidden rounded-2xl border border-charcoal/8 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <TicketPass payload={payload} reference={ticket.reference} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold text-charcoal">{ticket.showTitle}</h2>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                upcoming
                  ? 'border-emerald/20 bg-emerald/10 text-emerald'
                  : 'border-charcoal/10 bg-charcoal/5 text-slate'
              }`}
            >
              {upcoming ? 'Upcoming' : 'Past'}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-sm text-slate">
            <IconPin className="h-3.5 w-3.5" />
            {ticket.venueName}, {ticket.venueCity}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate">
            <IconClock className="h-3.5 w-3.5" />
            {formatShowTime(ticket.startsAt, ticket.timezone)}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-slate">
            {ticket.items.map((item) => (
              <li key={`${item.label}-${item.quantity}`}>
                {item.quantity} × {item.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold tabular-nums text-charcoal">
            Total {formatPrice(ticket.totalMinor)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/booking/${ticket.bookingId}`}>
              <Button variant="secondary" size="sm">
                View booking
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => onRemove(ticket.bookingId)}>
              Remove from this device
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function TicketWallet() {
  const hydrating = useSyncExternalStore(
    subscribeHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const tickets = useSyncExternalStore(subscribeWallet, getWalletSnapshot, getServerWalletSnapshot);
  const pending = useSyncExternalStore(
    subscribePendingHold,
    getPendingHoldSnapshot,
    getServerPendingHoldSnapshot,
  );

  const handleRemove = (bookingId: string) => {
    removeWalletTicket(bookingId);
  };

  if (hydrating) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-48 animate-pulse rounded-2xl bg-white shadow-card" />
        <div className="h-48 animate-pulse rounded-2xl bg-white shadow-card" />
      </div>
    );
  }

  const upcoming = tickets.filter((ticket) => isUpcomingTicket(ticket));
  const past = tickets
    .filter((ticket) => !isUpcomingTicket(ticket))
    .slice()
    .reverse();

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Pending</h2>
        {pending ? (
          <PendingHoldCard hold={pending} />
        ) : (
          <div className="rounded-2xl border border-dashed border-charcoal/12 bg-white/50 px-5 py-6">
            <p className="text-sm font-semibold text-charcoal">No reservation in progress</p>
            <p className="mt-1 text-sm leading-relaxed text-slate">
              Hold tickets on a show, then come back here to finish checkout before the 10-minute
              timer ends.
            </p>
            <Link href="/" className="mt-4 inline-flex">
              <Button variant="secondary" size="sm">
                Browse shows
              </Button>
            </Link>
          </div>
        )}
      </section>
      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Upcoming</h2>
          {upcoming.map((ticket) => (
            <TicketCard key={ticket.bookingId} ticket={ticket} onRemove={handleRemove} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">Past</h2>
          {past.map((ticket) => (
            <TicketCard key={ticket.bookingId} ticket={ticket} onRemove={handleRemove} />
          ))}
        </section>
      )}
    </div>
  );
}
