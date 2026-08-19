import { getOrganisers } from '@/server/repositories/shows';
import { OrganiserDashboardClient } from '@/components/organiser/dashboard-client';

export default async function OrganiserPage() {
  const organisers = await getOrganisers();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
        Organiser Dashboard
      </h1>
      <p className="text-slate mb-8">
        Manage your shows and view bookings.
      </p>
      <OrganiserDashboardClient organisers={organisers} />
    </div>
  );
}
