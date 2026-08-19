'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { TicketPass } from '@/components/tickets/ticket-pass';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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

function TicketIcon() {
  return (
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-charcoal/5">
      <svg
        className="h-8 w-8 text-slate-light"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
        />
      </svg>
    </div>
  );
}

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
    <article className="rounded-xl border border-charcoal/5 bg-white p-6 shadow-card">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <TicketPass payload={payload} reference={ticket.reference} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-charcoal">
              {ticket.showTitle}
            </h2>
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
          <p className="text-sm text-slate">
            {ticket.venueName}, {ticket.venueCity}
          </p>
          <p className="text-sm text-slate">{formatShowTime(ticket.startsAt, ticket.timezone)}</p>
          <ul className="mt-4 space-y-1 text-sm text-slate">
            {ticket.items.map((item) => (
              <li key={`${item.label}-${item.quantity}`}>
                {item.quantity} × {item.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold text-charcoal">
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

  const handleRemove = (bookingId: string) => {
    removeWalletTicket(bookingId);
  };

  if (hydrating) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="h-48 animate-pulse rounded-xl bg-white shadow-card" />
        <div className="h-48 animate-pulse rounded-xl bg-white shadow-card" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={<TicketIcon />}
        title="No tickets on this device"
        description="When you confirm a booking, the ticket is saved here so you can show the QR code at the door."
        action={
          <Link href="/">
            <Button variant="secondary">Browse shows</Button>
          </Link>
        }
      />
    );
  }

  const upcoming = tickets.filter((ticket) => isUpcomingTicket(ticket));
  const past = tickets
    .filter((ticket) => !isUpcomingTicket(ticket))
    .slice()
    .reverse();

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate">Upcoming</h2>
          {upcoming.map((ticket) => (
            <TicketCard key={ticket.bookingId} ticket={ticket} onRemove={handleRemove} />
          ))}
        </section>
      )}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate">Past</h2>
          {past.map((ticket) => (
            <TicketCard key={ticket.bookingId} ticket={ticket} onRemove={handleRemove} />
          ))}
        </section>
      )}
    </div>
  );
}
