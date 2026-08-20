'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/ui/countdown';
import { IconClock, IconPin } from '@/components/ui/icons';
import { formatPrice } from '@/domain/pricing';
import { formatShowTime } from '@/domain/time';
import { checkoutPath, clearPendingHold, type PendingHold } from '@/lib/pending-hold';

interface PendingHoldCardProps {
  hold: PendingHold;
}

export function PendingHoldCard({ hold }: PendingHoldCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-amber/30 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-xs font-medium text-amber-dark">
              Pending
            </span>
            <Countdown
              expiresAt={hold.expiresAt}
              size="sm"
              onExpire={() => clearPendingHold(hold.holdId)}
            />
          </div>
          <h2 className="font-display text-xl font-bold text-charcoal">{hold.showTitle}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate">
            <IconPin className="h-3.5 w-3.5" />
            {hold.venueName}, {hold.venueCity}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate">
            <IconClock className="h-3.5 w-3.5" />
            {formatShowTime(hold.startsAt, hold.timezone)}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-slate">
            {hold.items.map((item) => (
              <li key={`${item.label}-${item.quantity}`}>
                {item.quantity} × {item.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold tabular-nums text-charcoal">
            Total {formatPrice(hold.totalMinor)}
          </p>
        </div>
        <Link href={checkoutPath(hold.holdId)} className="sm:shrink-0">
          <Button className="w-full sm:w-auto">Complete booking</Button>
        </Link>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate">
        These seats are held on this device. Confirm before the timer ends — leaving the site does
        not cancel the reservation.
      </p>
    </article>
  );
}
