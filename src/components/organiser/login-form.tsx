'use client';

import { useActionState } from 'react';
import { signIn } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { hintClassName, inputClassName, labelClassName } from '@/components/ui/field';
import { DEMO_ORGANISER_PASSWORD, DEMO_ORGANISERS } from '@/types/domain';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <div>
      <form
        action={formAction}
        className="space-y-4 rounded-2xl border border-charcoal/8 bg-white p-6 shadow-card"
      >
        <div>
          <label htmlFor="email" className={labelClassName}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={DEMO_ORGANISERS[0].email}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClassName}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            defaultValue={DEMO_ORGANISER_PASSWORD}
            className={inputClassName}
          />
        </div>
        {state?.error && <Alert>{state.error}</Alert>}
        <Button type="submit" className="w-full" size="lg" loading={pending}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border border-dashed border-charcoal/12 bg-white/50 p-5">
        <p className="text-sm font-medium text-charcoal">Demo accounts</p>
        <p className={hintClassName}>Password: {DEMO_ORGANISER_PASSWORD}</p>
        <ul className="mt-3 space-y-2 text-sm text-slate">
          {DEMO_ORGANISERS.map((org) => (
            <li key={org.email} className="flex flex-col sm:flex-row sm:gap-2">
              <span className="font-medium text-charcoal">{org.name}</span>
              <span>{org.email}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-slate">
          Sign in as one organiser, then try to open the other&apos;s show IDs. Row-level security
          blocks it even if the page forgets to filter.
        </p>
      </div>
    </div>
  );
}
