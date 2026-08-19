import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getOrganiserShow, getVenues } from '@/server/repositories/shows';
import { ShowForm } from '@/components/organiser/show-form';

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
        Edit show
      </h1>
      <p className="text-slate mb-8">
        You can only edit shows you own. The database enforces that.
      </p>
      <ShowForm venues={venues} show={show} />
    </div>
  );
}
