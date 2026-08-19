import { LoginForm } from '@/components/organiser/login-form';
import { PageHeader } from '@/components/ui/page-header';

export default function OrganiserLoginPage() {
  return (
    <div className="page-wrap max-w-lg py-8 sm:py-12">
      <PageHeader
        kicker="Organisers"
        title="Sign in"
        description="Manage your own shows and bookings. Nothing else."
      />
      <LoginForm />
    </div>
  );
}
