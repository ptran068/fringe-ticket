import { LoginForm } from '@/components/organiser/login-form';

export default function OrganiserLoginPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
        Organiser sign in
      </h1>
      <p className="text-slate mb-8">Manage your own shows and bookings. Nothing else.</p>
      <LoginForm />
    </div>
  );
}
