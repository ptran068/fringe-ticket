'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
      <div className="bg-white rounded-xl border border-charcoal/5 p-6 shadow-card">
        <h3 className="font-semibold text-charcoal mb-2">Tickets</h3>
        <p className="text-sm text-slate">
          {availability.status === 'sold_out'
            ? 'This show is sold out.'
            : 'All tickets are temporarily held. Try again shortly.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-charcoal/5 p-6 shadow-card space-y-5">
      <h3 className="font-semibold text-charcoal">Select Tickets</h3>

      {/* Tier selectors */}
      <div className="space-y-4">
        {tiers.map((tier) => {
          const unitPrice = tierPrice(show.base_price_minor, tier.percentage);
          const qty = selections[tier.id] ?? 0;

          return (
            <div key={tier.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-charcoal">{tier.label}</p>
                <p className="text-xs text-slate">{formatPrice(unitPrice)}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updateQuantity(tier.id, -1)}
                  disabled={qty <= 0}
                  className="w-8 h-8 rounded-full border border-charcoal/10 text-charcoal flex items-center justify-center hover:bg-cream-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label={`Decrease ${tier.label} quantity`}
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold tabular-nums text-sm">{qty}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(tier.id, 1)}
                  disabled={totalQty >= availability.available}
                  className="w-8 h-8 rounded-full border border-charcoal/10 text-charcoal flex items-center justify-center hover:bg-cream-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  aria-label={`Increase ${tier.label} quantity`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Order summary */}
      {totalQty > 0 && (
        <div className="border-t border-charcoal/5 pt-4 space-y-2 animate-fade-in">
          {order.lineItems.map((item) => (
            <div key={item.tierId} className="flex justify-between text-sm">
              <span className="text-slate">
                {item.quantity} × {item.tierLabel}
              </span>
              <span className="text-charcoal font-medium">{formatPrice(item.lineTotalMinor)}</span>
            </div>
          ))}

          <div className="flex justify-between text-sm">
            <span className="text-slate">Booking fee</span>
            <span className="text-charcoal font-medium">{formatPrice(order.feeMinor)}</span>
          </div>

          <div className="flex justify-between text-base font-bold border-t border-charcoal/5 pt-2 mt-2">
            <span>Total</span>
            <span>{formatPrice(order.totalMinor)}</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="bg-coral/10 border border-coral/20 rounded-lg p-3 text-sm text-coral animate-fade-in"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* CTA */}
      <Button
        size="lg"
        className="w-full"
        disabled={totalQty === 0}
        loading={isPending}
        onClick={handleHold}
      >
        {isPending ? 'Reserving...' : 'Hold tickets'}
      </Button>

      <p className="text-xs text-slate text-center">
        Tickets are held for 10 minutes. No payment required to hold.
      </p>
    </div>
  );
}
