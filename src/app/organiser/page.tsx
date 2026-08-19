import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrganiserBookings, getOrganiserShows } from '@/server/repositories/shows';
import { OrganiserDashboard } from '@/components/organiser/dashboard-client';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { IconPlus } from '@/components/ui/icons';

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
    <div className="page-wrap py-8 sm:py-12">
      <PageHeader
        kicker="Backstage"
        title="Organiser dashboard"
        description={`Signed in as ${organiser?.name ?? user.email}. RLS scopes every query to your rows.`}
        action={
          <Link href="/organiser/shows/new">
            <Button>
              <IconPlus className="h-4 w-4" />
              New show
            </Button>
          </Link>
        }
      />
      <OrganiserDashboard shows={shows} bookings={bookings ?? []} />
    </div>
  );
}
