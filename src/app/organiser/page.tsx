import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrganiserBookings, getOrganiserShows } from '@/server/repositories/shows';
import { OrganiserDashboard } from '@/components/organiser/dashboard-client';

export default async function OrganiserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/organiser/login');

  const { data: organiser } = await supabase
    .from('organisers')
    .select('*')
    .eq('id', user.id)
    .single();

  const [shows, bookings] = await Promise.all([getOrganiserShows(), getOrganiserBookings()]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
            Organiser dashboard
          </h1>
          <p className="text-slate">
            Signed in as{' '}
            <span className="font-medium text-charcoal">{organiser?.name ?? user.email}</span>. RLS
            scopes every query to your rows.
          </p>
        </div>
        <Link
          href="/organiser/shows/new"
          className="inline-flex items-center justify-center bg-charcoal text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-charcoal-light"
        >
          New show
        </Link>
      </div>
      <OrganiserDashboard shows={shows} bookings={bookings ?? []} />
    </div>
  );
}
