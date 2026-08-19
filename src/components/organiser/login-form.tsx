'use client';

import { useActionState } from 'react';
import { signIn } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { DEMO_ORGANISER_PASSWORD, DEMO_ORGANISERS } from '@/types/domain';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <div className="max-w-md mx-auto">
      <form
        action={formAction}
        className="bg-white rounded-xl border border-charcoal/5 p-6 shadow-card space-y-4"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={DEMO_ORGANISERS[0].email}
            className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            defaultValue={DEMO_ORGANISER_PASSWORD}
            className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-coral" role="alert">
            {state.error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-sm text-slate space-y-2">
        <p className="font-medium text-charcoal">
          Demo accounts (password: {DEMO_ORGANISER_PASSWORD})
        </p>
        <ul className="list-disc pl-5 space-y-1">
          {DEMO_ORGANISERS.map((org) => (
            <li key={org.email}>
              {org.name} — {org.email}
            </li>
          ))}
        </ul>
        <p>
          Sign in as one organiser, then try to open the other&apos;s show IDs. Row-level security
          blocks it even if the page forgets to filter.
        </p>
      </div>
    </div>
  );
}
