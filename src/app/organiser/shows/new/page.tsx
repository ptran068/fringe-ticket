import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getVenues } from '@/server/repositories/shows';
import { ShowForm } from '@/components/organiser/show-form';

export default async function NewShowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/organiser/login');

  const venues = await getVenues();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
        New show
      </h1>
      <p className="text-slate mb-8">Times are saved in the venue&apos;s timezone, not yours.</p>
      <ShowForm venues={venues} />
    </div>
  );
}
