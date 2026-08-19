import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getVenues } from '@/server/repositories/shows';
import { ShowForm } from '@/components/organiser/show-form';
import { PageHeader } from '@/components/ui/page-header';
import { IconChevronLeft } from '@/components/ui/icons';

export default async function NewShowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/organiser/login');

  const venues = await getVenues();

  return (
    <div className="page-wrap py-8 sm:py-12">
      <Link
        href="/organiser"
        className="mb-6 inline-flex items-center gap-1 text-sm text-slate transition-colors hover:text-charcoal"
      >
        <IconChevronLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <PageHeader
        kicker="New listing"
        title="Create a show"
        description="Times are saved in the venue's timezone, not yours."
      />
      <ShowForm venues={venues} />
    </div>
  );
}
