import Link from 'next/link';
import type { ShowWithAvailability } from '@/types/domain';
import { formatPrice } from '@/domain/pricing';
import { relativeShowDay, formatShowTimeOnly } from '@/domain/time';
import { AvailabilityBadge } from '@/components/ui/availability-badge';
import { Button } from '@/components/ui/button';

interface ShowCardProps {
  show: ShowWithAvailability;
}

export function ShowCard({ show }: ShowCardProps) {
  const venue = show.venues;
  const isSoldOut = show.availability.status === 'sold_out';

  return (
    <article
      className={`
        group bg-white rounded-xl border border-charcoal/5 overflow-hidden
        shadow-card hover:shadow-card-hover transition-all duration-300
        ${isSoldOut ? 'opacity-70' : ''}
      `}
    >
      <div className="p-6 flex flex-col h-full">
        {/* Title */}
        <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-charcoal leading-tight mb-2 group-hover:text-amber-dark transition-colors">
          {show.title}
        </h3>

        {/* Venue & City */}
        <div className="flex items-center gap-1.5 text-sm text-slate mb-1">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
            />
          </svg>
          <span>{venue.name}</span>
          <span className="text-charcoal/20">·</span>
          <span>{venue.city}</span>
        </div>

        {/* Date & Time (venue timezone) */}
        <div className="flex items-center gap-1.5 text-sm text-slate mb-4">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {relativeShowDay(show.starts_at, venue.timezone)} ·{' '}
            {formatShowTimeOnly(show.starts_at, venue.timezone)}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: Price + Availability + CTA */}
        <div className="flex items-end justify-between gap-3 pt-3 border-t border-charcoal/5">
          <div className="space-y-1.5">
            <p className="text-lg font-bold text-charcoal">
              <span className="text-xs font-normal text-slate mr-0.5">From</span>
              {formatPrice(show.price_from_minor ?? show.base_price_minor)}
            </p>
            <AvailabilityBadge availability={show.availability} />
          </div>

          {!isSoldOut ? (
            <Link href={`/shows/${show.id}`}>
              <Button size="md">Get tickets</Button>
            </Link>
          ) : (
            <Button size="md" disabled variant="ghost">
              Sold out
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
