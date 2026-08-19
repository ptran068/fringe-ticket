import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getShow, getShowAvailability, getTicketTiers } from '@/server/repositories/shows';
import { formatShowTime, formatShowDate } from '@/domain/time';
import { formatPrice, tierPrice } from '@/domain/pricing';
import { AvailabilityBadge } from '@/components/ui/availability-badge';
import { TicketSelector } from '@/components/checkout/ticket-selector';

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-slate hover:text-charcoal transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to shows
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-3">
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-bold text-charcoal leading-tight mb-4">
            {show.title}
          </h1>

          {show.description && (
            <p className="text-slate text-lg mb-6 leading-relaxed">{show.description}</p>
          )}

          <div className="space-y-3 mb-6">
            <InfoRow
              icon={
                <svg
                  className="w-5 h-5"
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
              }
              label={`${venue.name}, ${venue.city}`}
            />
            <InfoRow
              icon={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              }
              label={formatShowDate(show.starts_at, venue.timezone)}
            />
            <InfoRow
              icon={
                <svg
                  className="w-5 h-5"
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
              }
              label={formatShowTime(show.starts_at, venue.timezone)}
            />
          </div>

          <AvailabilityBadge availability={availability} />

          <div className="mt-8 bg-white rounded-xl border border-charcoal/5 p-6">
            <h3 className="text-sm font-semibold text-charcoal uppercase tracking-wider mb-4">
              Ticket Prices
            </h3>
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div key={tier.id} className="flex justify-between items-center">
                  <span className="text-sm text-slate">
                    {tier.label}
                    {tier.percentage < 100 && (
                      <span className="text-xs text-slate-light ml-1">({tier.percentage}%)</span>
                    )}
                  </span>
                  <span className="font-semibold text-charcoal">
                    {formatPrice(tierPrice(show.base_price_minor, tier.percentage))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <TicketSelector show={show} availability={availability} tiers={tiers} />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-slate">
      <span className="text-slate-light shrink-0">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
