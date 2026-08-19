import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrganiserShow, getVenues } from '@/server/repositories/shows';
import { ShowForm } from '@/components/organiser/show-form';
import { PageHeader } from '@/components/ui/page-header';
import { IconChevronLeft } from '@/components/ui/icons';

interface EditShowPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditShowPage({ params }: EditShowPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/organiser/login');

  const [show, venues] = await Promise.all([getOrganiserShow(id), getVenues()]);
  if (!show) notFound();

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
        kicker="Edit listing"
        title="Edit show"
        description="You can only edit shows you own. The database enforces that."
      />
      <ShowForm venues={venues} show={show} />
    </div>
  );
}
