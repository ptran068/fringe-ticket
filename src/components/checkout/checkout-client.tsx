'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Countdown } from '@/components/ui/countdown';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { formatPrice } from '@/domain/pricing';
import { formatShowTime } from '@/domain/time';
import { confirmHold } from '@/server/actions/holds';
import { IconClock, IconPin, IconTicket } from '@/components/ui/icons';
import Link from 'next/link';

interface CheckoutClientProps {
  hold: {
    id: string;
    status: string;
    expires_at: string;
    quantity: number;
    shows: {
      id: string;
      title: string;
      starts_at: string;
      base_price_minor: number;
      venues: {
        name: string;
        city: string;
        timezone: string;
      };
    };
    hold_items: {
      id: string;
      tier_id: string;
      quantity: number;
      unit_price_minor: number;
      ticket_tiers: {
        label: string;
        percentage: number;
      };
    }[];
  };
}

export function CheckoutClient({ hold }: CheckoutClientProps) {
  const router = useRouter();
  const initialExpired = hold.status !== 'active';
  const [expired, setExpired] = useState(initialExpired);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subtotal = hold.hold_items.reduce(
    (sum, item) => sum + item.unit_price_minor * item.quantity,
    0,
  );
  const fee = Math.min(Math.round((subtotal * 6) / 100), 900);
  const total = subtotal + fee;

  const show = hold.shows;
  const venue = show.venues;

  const handleExpire = useCallback(() => {
    setExpired(true);
  }, []);

  const handleConfirm = () => {
    startTransition(async () => {
      const result = await confirmHold(hold.id);

      if (!result.success) {
        if (result.error === 'HOLD_EXPIRED') {
          setExpired(true);
          setError(null);
        } else {
          setError('Something went wrong. Please try again.');
        }
        return;
      }

      router.push(`/booking/${result.booking_id}`);
    });
  };

  if (expired || hold.status === 'expired' || hold.status === 'confirmed') {
    return (
      <div className="mx-auto max-w-md py-8 text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-coral/10">
          <IconClock className="h-10 w-10 text-coral" />
        </div>
        <h1 className="font-display text-3xl font-bold text-charcoal">
          {hold.status === 'confirmed' ? 'Already confirmed' : 'Your hold has expired'}
        </h1>
        <p className="mt-2 text-slate">
          {hold.status === 'confirmed'
            ? 'This hold has already been converted to a booking.'
            : 'These tickets have been returned to the pool.'}
        </p>
        <Link href={`/shows/${show.id}`} className="mt-6 inline-flex">
          <Button variant="secondary">Back to show</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <li className="rounded-full bg-charcoal px-3 py-1 text-white">1. Reserved</li>
        <li className="h-px w-8 bg-charcoal/15" aria-hidden="true" />
        <li className="rounded-full bg-amber/20 px-3 py-1 text-amber-dark">2. Confirm</li>
      </ol>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber/15 text-amber-dark">
          <IconTicket className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-bold text-charcoal">Tickets reserved</h1>
        <p className="mt-2 text-sm text-slate">Complete your booking before the timer runs out.</p>
      </div>

      <div className="ticket-notch mb-6 overflow-hidden rounded-2xl border border-charcoal/8 bg-white p-6 text-center shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
          Time remaining
        </p>
        <Countdown expiresAt={hold.expires_at} onExpire={handleExpire} className="mt-3" />
      </div>

      <div className="mb-4 rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card">
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

      <div className="mb-6 rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
          Order summary
        </h3>

        <div className="mt-4 space-y-3">
          {hold.hold_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-slate">
                {item.quantity} × {item.ticket_tiers.label}
              </span>
              <span className="font-medium tabular-nums text-charcoal">
                {formatPrice(item.unit_price_minor * item.quantity)}
              </span>
            </div>
          ))}

          <div className="flex justify-between border-t border-dashed border-charcoal/10 pt-3 text-sm">
            <span className="text-slate">Subtotal</span>
            <span className="font-medium tabular-nums text-charcoal">{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate">Booking fee (6%, max $9)</span>
            <span className="font-medium tabular-nums text-charcoal">{formatPrice(fee)}</span>
          </div>

          <div className="flex justify-between border-t border-charcoal/8 pt-3 text-lg font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {error && <Alert className="mb-4">{error}</Alert>}

      <Button size="lg" className="w-full" loading={isPending} onClick={handleConfirm}>
        {isPending ? 'Confirming...' : 'Confirm booking'}
      </Button>

      <p className="mt-3 text-center text-xs text-slate">
        No payment is charged. This is a demonstration.
      </p>
    </div>
  );
}
