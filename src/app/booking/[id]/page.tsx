import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBooking } from '@/server/repositories/shows';
import { formatPrice } from '@/domain/pricing';
import { encodeTicketQr } from '@/domain/ticket';
import { formatShowTime } from '@/domain/time';
import { getRequestOrigin } from '@/lib/origin';
import { renderTicketQrSvg } from '@/lib/qr';
import { Button } from '@/components/ui/button';
import { SaveTicket } from '@/components/tickets/save-ticket';
import { TicketPass } from '@/components/tickets/ticket-pass';
import { IconCheck, IconClock, IconPin } from '@/components/ui/icons';

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params;
  const booking = await getBooking(id);

  if (!booking) notFound();

  const show = booking.shows;
  const venue = show.venues;
  const origin = await getRequestOrigin();
  const payload = encodeTicketQr({ origin, bookingId: booking.id });
  const qrSvg = await renderTicketQrSvg(payload);

  return (
    <div className="page-wrap max-w-2xl py-8 sm:py-12">
      <div className="mb-8 text-center animate-slide-up">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald/10">
          <IconCheck className="h-8 w-8 text-emerald" />
        </div>
        <p className="kicker mb-2">You&apos;re in</p>
        <h1 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">
          Booking confirmed
        </h1>
        <p className="mt-2 font-mono text-lg font-bold tracking-[0.2em] text-amber-dark">
          {booking.reference}
        </p>
      </div>

      <div className="ticket-notch mb-6 overflow-hidden rounded-2xl border border-charcoal/8 bg-white p-6 text-center shadow-card animate-fade-in">
        <TicketPass payload={payload} reference={booking.reference} svg={qrSvg} />
        <div className="mt-4">
          <SaveTicket
            ticket={{
              bookingId: booking.id,
              reference: booking.reference,
              showTitle: show.title,
              venueName: venue.name,
              venueCity: venue.city,
              timezone: venue.timezone,
              startsAt: show.starts_at,
              items: booking.booking_items.map((item) => ({
                label: item.ticket_tiers.label,
                quantity: item.quantity,
              })),
              totalMinor: booking.total_minor,
            }}
          />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card animate-fade-in">
        <h2 className="font-display text-xl font-bold text-charcoal">{show.title}</h2>
        <div className="mt-3 space-y-2 text-sm text-slate">
          <p className="flex items-center gap-2">
            <IconPin className="h-4 w-4 text-slate-light" />
            {venue.name}, {venue.city}
          </p>
          <p className="flex items-center gap-2">
            <IconClock className="h-4 w-4 text-slate-light" />
            {formatShowTime(show.starts_at, venue.timezone)}
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card animate-fade-in">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
          Order details
        </h3>
        <div className="mt-4 space-y-3">
          {booking.booking_items.map((item) => (
            <div key={item.tier_id} className="flex justify-between text-sm">
              <span className="text-slate">
                {item.quantity} × {item.ticket_tiers.label}
              </span>
              <span className="font-medium tabular-nums text-charcoal">
                {formatPrice(item.line_total_minor)}
              </span>
            </div>
          ))}
          <div className="space-y-2 border-t border-dashed border-charcoal/10 pt-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate">Subtotal</span>
              <span className="tabular-nums text-charcoal">
                {formatPrice(booking.subtotal_minor)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate">Booking fee</span>
              <span className="tabular-nums text-charcoal">{formatPrice(booking.fee_minor)}</span>
            </div>
            <div className="flex justify-between border-t border-charcoal/8 pt-2 text-lg font-bold">
              <span>Total paid</span>
              <span className="tabular-nums">{formatPrice(booking.total_minor)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/tickets">
          <Button>My tickets</Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Browse more shows</Button>
        </Link>
      </div>
    </div>
  );
}
