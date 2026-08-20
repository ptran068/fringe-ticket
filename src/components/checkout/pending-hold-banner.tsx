'use client';

import Link from 'next/link';
import { Countdown } from '@/components/ui/countdown';
import { IconTicket } from '@/components/ui/icons';
import { checkoutPath, clearPendingHold, type PendingHold } from '@/lib/pending-hold';

interface PendingHoldBannerProps {
  hold: PendingHold;
}

export function PendingHoldBanner({ hold }: PendingHoldBannerProps) {
  return (
    <div className="border-t border-amber/25 bg-amber/12">
      <div className="page-wrap flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber/20 text-amber-dark sm:mt-0">
            <IconTicket className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-charcoal">
              Tickets reserved
              <span className="mx-2 font-normal text-slate-light" aria-hidden="true">
                ·
              </span>
              <Countdown
                expiresAt={hold.expiresAt}
                size="sm"
                onExpire={() => clearPendingHold(hold.holdId)}
              />
            </p>
            <p className="truncate text-sm text-slate">{hold.showTitle}</p>
          </div>
        </div>
        <Link
          href={checkoutPath(hold.holdId)}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-charcoal px-4 text-sm font-semibold text-white shadow-card transition-all hover:bg-ink sm:shrink-0"
        >
          Complete booking
        </Link>
      </div>
    </div>
  );
}
