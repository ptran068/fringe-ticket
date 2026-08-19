'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { formatPrice, tierPrice, calculateOrder } from '@/domain/pricing';
import { createHold } from '@/server/actions/holds';
import type { Show, ShowAvailability, TicketTier } from '@/types/domain';

interface TicketSelectorProps {
  show: Show;
  availability: ShowAvailability;
  tiers: TicketTier[];
}

export function TicketSelector({ show, availability, tiers }: TicketSelectorProps) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isDisabled =
    availability.status === 'sold_out' || availability.status === 'temporarily_unavailable';
  const totalQty = Object.values(selections).reduce((a, b) => a + b, 0);

  const order = calculateOrder(
    show.base_price_minor,
    tiers.map((t) => ({ id: t.id, label: t.label, percentage: t.percentage })),
    selections,
  );

  const updateQuantity = (tierId: string, delta: number) => {
    setSelections((prev) => {
      const current = prev[tierId] ?? 0;
      const next = Math.max(0, Math.min(current + delta, availability.available));
      return { ...prev, [tierId]: next };
    });
    setError(null);
  };

  const handleHold = () => {
    if (totalQty === 0) return;

    const items = Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([tierId, quantity]) => ({ tier_id: tierId, quantity }));

    startTransition(async () => {
      const result = await createHold(show.id, items);

      if (!result.success) {
        if (result.error === 'INSUFFICIENT_INVENTORY') {
          setError(
            result.available === 0
              ? 'Those tickets were just taken by another customer.'
              : `Only ${result.available} ticket${result.available === 1 ? '' : 's'} available. Please reduce your selection.`,
          );
        } else {
          setError('Something went wrong. Please try again.');
        }
        return;
      }

      router.push(`/checkout/${result.hold_id}`);
    });
  };

  if (isDisabled) {
    return (
      <div className="rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card">
        <p className="kicker mb-2">Tickets</p>
        <h3 className="font-display text-xl font-bold text-charcoal">Unavailable</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate">
          {availability.status === 'sold_out'
            ? 'This show is sold out.'
            : 'All tickets are temporarily held. Try again shortly.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card">
      <div>
        <p className="kicker mb-1">Tickets</p>
        <h3 className="font-display text-xl font-bold text-charcoal">Select your seats</h3>
        <p className="mt-1 text-sm text-slate">
          {availability.available} {availability.available === 1 ? 'ticket' : 'tickets'} remaining
        </p>
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const unitPrice = tierPrice(show.base_price_minor, tier.percentage);
          const qty = selections[tier.id] ?? 0;
          const selected = qty > 0;

          return (
            <div
              key={tier.id}
              className={`flex items-center justify-between rounded-xl border px-3.5 py-3 transition-colors ${
                selected ? 'border-amber/40 bg-amber/8' : 'border-charcoal/8 bg-ghost/60'
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-charcoal">{tier.label}</p>
                <p className="text-xs tabular-nums text-slate">{formatPrice(unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => updateQuantity(tier.id, -1)}
                  disabled={qty <= 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-white text-lg text-charcoal transition-colors hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                  aria-label={`Decrease ${tier.label} quantity`}
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(tier.id, 1)}
                  disabled={totalQty >= availability.available}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-white text-lg text-charcoal transition-colors hover:bg-cream-dark disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                  aria-label={`Increase ${tier.label} quantity`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {totalQty > 0 && (
        <div className="space-y-2 border-t border-dashed border-charcoal/10 pt-4 animate-fade-in">
          {order.lineItems.map((item) => (
            <div key={item.tierId} className="flex justify-between text-sm">
              <span className="text-slate">
                {item.quantity} × {item.tierLabel}
              </span>
              <span className="font-medium tabular-nums text-charcoal">
                {formatPrice(item.lineTotalMinor)}
              </span>
            </div>
          ))}

          <div className="flex justify-between text-sm">
            <span className="text-slate">Booking fee</span>
            <span className="font-medium tabular-nums text-charcoal">
              {formatPrice(order.feeMinor)}
            </span>
          </div>

          <div className="mt-2 flex justify-between border-t border-charcoal/8 pt-2 text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(order.totalMinor)}</span>
          </div>
        </div>
      )}

      {error && <Alert>{error}</Alert>}

      <Button
        size="lg"
        className="w-full"
        disabled={totalQty === 0}
        loading={isPending}
        onClick={handleHold}
      >
        {isPending ? 'Reserving...' : totalQty === 0 ? 'Select tickets' : 'Hold tickets'}
      </Button>

      <p className="text-center text-xs leading-relaxed text-slate">
        Held for 10 minutes. No payment required to hold.
      </p>
    </div>
  );
}
