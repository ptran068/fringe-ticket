import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getShow, getShowAvailability, getTicketTiers } from '@/server/repositories/shows';
import { formatShowTimeOnly, formatShowDate, showDateParts } from '@/domain/time';
import { formatPrice, tierPrice } from '@/domain/pricing';
import { AvailabilityBadge } from '@/components/ui/availability-badge';
import { TicketSelector } from '@/components/checkout/ticket-selector';
import { IconCalendar, IconChevronLeft, IconClock, IconPin } from '@/components/ui/icons';
import { showPosterTone } from '@/lib/show-art';

interface ShowPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShowPage({ params }: ShowPageProps) {
  const { id } = await params;
  const [show, availability, tiers] = await Promise.all([
    getShow(id),
    getShowAvailability(id),
    getTicketTiers(),
  ]);

  if (!show) notFound();

  const venue = show.venues;
  const parts = showDateParts(show.starts_at, venue.timezone);

  return (
    <div>
      <div
        className={`relative isolate overflow-hidden bg-gradient-to-br text-white ${showPosterTone(show.id)}`}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber/25 blur-3xl"
          aria-hidden="true"
        />
        <div className="page-wrap relative py-8 sm:py-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1 text-sm text-white/70 transition-colors hover:text-white"
          >
            <IconChevronLeft className="h-4 w-4" />
            Back to shows
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="kicker !text-amber-light mb-3">{venue.city}</p>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
                {show.title}
              </h1>
              {show.description && (
                <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
                  {show.description}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center backdrop-blur-sm">
              <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-white/70">
                {parts.month}
              </p>
              <p className="font-display text-4xl font-bold leading-none">{parts.day}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/70">{parts.weekday}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-wrap py-8 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-3">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <AvailabilityBadge availability={availability} />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard
                icon={<IconPin className="h-5 w-5" />}
                label="Venue"
                value={`${venue.name}, ${venue.city}`}
              />
              <InfoCard
                icon={<IconCalendar className="h-5 w-5" />}
                label="Date"
                value={formatShowDate(show.starts_at, venue.timezone)}
              />
              <InfoCard
                icon={<IconClock className="h-5 w-5" />}
                label="Time"
                value={formatShowTimeOnly(show.starts_at, venue.timezone)}
              />
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate">
                Ticket prices
              </h2>
              <ul className="mt-4 divide-y divide-charcoal/6">
                {tiers.map((tier) => (
                  <li
                    key={tier.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-slate">
                      {tier.label}
                      {tier.percentage < 100 && (
                        <span className="ml-1.5 text-xs text-slate-light">
                          ({tier.percentage}%)
                        </span>
                      )}
                    </span>
                    <span className="font-semibold tabular-nums text-charcoal">
                      {formatPrice(tierPrice(show.base_price_minor, tier.percentage))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <TicketSelector show={show} availability={availability} tiers={tiers} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-charcoal/8 bg-white p-4 shadow-card">
      <div className="flex items-center gap-2 text-slate-light">
        {icon}
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug text-charcoal">{value}</p>
    </div>
  );
}
