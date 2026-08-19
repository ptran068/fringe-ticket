import Link from 'next/link';
import type { ShowWithAvailability } from '@/types/domain';
import { formatPrice } from '@/domain/pricing';
import { relativeShowDay, formatShowTimeOnly, showDateParts } from '@/domain/time';
import { AvailabilityBadge } from '@/components/ui/availability-badge';
import { IconPin } from '@/components/ui/icons';
import { showPosterTone } from '@/lib/show-art';

interface ShowCardProps {
  show: ShowWithAvailability;
}

export function ShowCard({ show }: ShowCardProps) {
  const venue = show.venues;
  const isSoldOut = show.availability.status === 'sold_out';
  const parts = showDateParts(show.starts_at, venue.timezone);
  const relative = relativeShowDay(show.starts_at, venue.timezone);

  return (
    <Link href={`/shows/${show.id}`} className="group block h-full focus-visible:outline-offset-4">
      <article
        className={`
          flex h-full flex-col overflow-hidden rounded-2xl border border-charcoal/8 bg-white
          shadow-card transition-all duration-300
          group-hover:-translate-y-1 group-hover:shadow-card-hover
          ${isSoldOut ? 'opacity-80' : ''}
        `}
      >
        <div
          className={`relative isolate overflow-hidden bg-gradient-to-br px-5 py-5 text-white ${showPosterTone(show.id)}`}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber/20 blur-2xl"
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-white/70">
                {parts.month}
              </p>
              <p className="font-display text-4xl font-bold leading-none">{parts.day}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/70">
                {parts.weekday}
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {relative}
            </span>
          </div>
          <p className="relative mt-5 text-sm font-medium text-white/85">
            {formatShowTimeOnly(show.starts_at, venue.timezone)}
          </p>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-xl font-bold leading-snug text-charcoal transition-colors group-hover:text-amber-dark">
            {show.title}
          </h3>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate">
            <IconPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {venue.name}
              <span className="mx-1 text-charcoal/20">·</span>
              {venue.city}
            </span>
          </p>

          <div className="mt-4 flex flex-1 items-end justify-between gap-3 border-t border-charcoal/6 pt-4">
            <div className="space-y-2">
              <p className="text-lg font-bold tabular-nums text-charcoal">
                <span className="mr-1 text-xs font-medium uppercase tracking-wider text-slate">
                  From
                </span>
                {formatPrice(show.price_from_minor ?? show.base_price_minor)}
              </p>
              <AvailabilityBadge availability={show.availability} />
            </div>
            <span
              className={`inline-flex min-h-10 items-center rounded-xl px-3.5 text-sm font-medium transition-colors ${
                isSoldOut ? 'bg-ghost text-slate' : 'bg-charcoal text-white group-hover:bg-ink'
              }`}
            >
              {isSoldOut ? 'Sold out' : 'Get tickets'}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
