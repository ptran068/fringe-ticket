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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="text-center mb-8 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-emerald/10 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-emerald"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
          Booking Confirmed
        </h1>
        <p className="text-lg font-mono font-bold text-amber-dark tracking-wider">
          {booking.reference}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-charcoal/5 p-6 mb-6 shadow-card animate-fade-in text-center">
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

      <div className="bg-white rounded-xl border border-charcoal/5 p-6 mb-6 shadow-card animate-fade-in">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-charcoal mb-3">
          {show.title}
        </h2>
        <div className="text-sm text-slate space-y-1">
          <p>
            {venue.name}, {venue.city}
          </p>
          <p>{formatShowTime(show.starts_at, venue.timezone)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-charcoal/5 p-6 mb-6 shadow-card animate-fade-in">
        <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-4">
          Order Details
        </h3>
        <div className="space-y-3">
          {booking.booking_items.map((item) => (
            <div key={item.tier_id} className="flex justify-between text-sm">
              <span className="text-slate">
                {item.quantity} × {item.ticket_tiers.label}
              </span>
              <span className="text-charcoal font-medium">
                {formatPrice(item.line_total_minor)}
              </span>
            </div>
          ))}
          <div className="border-t border-charcoal/5 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate">Subtotal</span>
              <span className="text-charcoal">{formatPrice(booking.subtotal_minor)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate">Booking fee</span>
              <span className="text-charcoal">{formatPrice(booking.fee_minor)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-charcoal/5 pt-2">
              <span>Total paid</span>
              <span>{formatPrice(booking.total_minor)}</span>
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
