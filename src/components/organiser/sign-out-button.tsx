'use client';

import { signOut } from '@/server/actions/auth';

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-full px-3.5 py-2 text-sm font-medium text-slate transition-colors hover:bg-charcoal/5 hover:text-charcoal cursor-pointer"
      >
        Sign out
      </button>
    </form>
  );
}
