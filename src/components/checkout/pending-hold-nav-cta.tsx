'use client';

import Link from 'next/link';
import { Countdown } from '@/components/ui/countdown';
import { checkoutPath, clearPendingHold, type PendingHold } from '@/lib/pending-hold';

interface PendingHoldNavCtaProps {
  hold: PendingHold;
  onNavigate?: () => void;
  compact?: boolean;
}

export function PendingHoldNavCta({ hold, onNavigate, compact = false }: PendingHoldNavCtaProps) {
  return (
    <Link
      href={checkoutPath(hold.holdId)}
      onClick={onNavigate}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-amber font-semibold text-charcoal shadow-card transition-colors hover:bg-amber-light ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
      }`}
    >
      {compact ? 'Confirm' : 'Complete booking'}
      <Countdown
        expiresAt={hold.expiresAt}
        size="sm"
        onExpire={() => clearPendingHold(hold.holdId)}
      />
    </Link>
  );
}
