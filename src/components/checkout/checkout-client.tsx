'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Countdown } from '@/components/ui/countdown';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/domain/pricing';
import { formatShowTime } from '@/domain/time';
import { confirmHold } from '@/server/actions/holds';
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
  // Determine initial expiry from server-provided data (not Date.now() during render)
  const initialExpired = hold.status !== 'active';
  const [expired, setExpired] = useState(initialExpired);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Check time-based expiry via countdown (client-side, after mount)

  const subtotal = hold.hold_items.reduce(
    (sum, item) => sum + item.unit_price_minor * item.quantity,
    0,
  );
  const fee = Math.min(Math.round(subtotal * 6 / 100), 900);
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

  // Expired state
  if (expired || hold.status === 'expired' || hold.status === 'confirmed') {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-coral" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-charcoal mb-2">
          {hold.status === 'confirmed' ? 'Already confirmed' : 'Your hold has expired'}
        </h1>
        <p className="text-slate mb-6">
          {hold.status === 'confirmed'
            ? 'This hold has already been converted to a booking.'
            : 'These tickets have been returned to the pool.'}
        </p>
        <Link href={`/shows/${show.id}`}>
          <Button variant="secondary">Back to show</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Status header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-charcoal mb-1">
          Tickets Reserved
        </h1>
        <p className="text-sm text-slate">
          Complete your booking before the timer expires.
        </p>
      </div>

      {/* Countdown */}
      <div className="bg-white rounded-xl border border-charcoal/5 p-6 text-center mb-6 shadow-card">
        <p className="text-xs uppercase tracking-wider text-slate font-medium mb-2">Time remaining</p>
        <Countdown expiresAt={hold.expires_at} onExpire={handleExpire} />
      </div>

      {/* Show info */}
      <div className="bg-white rounded-xl border border-charcoal/5 p-6 mb-6 shadow-card">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-charcoal mb-2">
          {show.title}
        </h2>
        <div className="text-sm text-slate space-y-1">
          <p>{venue.name}, {venue.city}</p>
          <p>{formatShowTime(show.starts_at, venue.timezone)}</p>
        </div>
      </div>

      {/* Order breakdown */}
      <div className="bg-white rounded-xl border border-charcoal/5 p-6 mb-6 shadow-card">
        <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-4">Order Summary</h3>

        <div className="space-y-3">
          {hold.hold_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-slate">
                {item.quantity} × {item.ticket_tiers.label}
              </span>
              <span className="text-charcoal font-medium">
                {formatPrice(item.unit_price_minor * item.quantity)}
              </span>
            </div>
          ))}

          <div className="flex justify-between text-sm border-t border-charcoal/5 pt-3">
            <span className="text-slate">Subtotal</span>
            <span className="text-charcoal font-medium">{formatPrice(subtotal)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate">Booking fee (6%, max $9)</span>
            <span className="text-charcoal font-medium">{formatPrice(fee)}</span>
          </div>

          <div className="flex justify-between text-lg font-bold border-t border-charcoal/5 pt-3">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-coral/10 border border-coral/20 rounded-lg p-3 text-sm text-coral mb-4 animate-fade-in" role="alert">
          {error}
        </div>
      )}

      {/* Confirm */}
      <Button size="lg" className="w-full" loading={isPending} onClick={handleConfirm}>
        {isPending ? 'Confirming...' : 'Confirm booking'}
      </Button>

      <p className="text-xs text-slate text-center mt-3">
        No payment is charged. This is a demonstration.
      </p>
    </div>
  );
}
