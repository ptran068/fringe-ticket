'use client';

import { signOut } from '@/server/actions/auth';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm font-medium text-slate hover:text-charcoal transition-colors cursor-pointer"
      >
        Sign out
      </button>
    </form>
  );
}
