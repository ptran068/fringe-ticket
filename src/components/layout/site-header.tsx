'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PendingHoldBanner } from '@/components/checkout/pending-hold-banner';
import { SignOutButton } from '@/components/organiser/sign-out-button';
import { IconClose, IconMenu } from '@/components/ui/icons';
import {
  checkoutPath,
  getPendingHoldSnapshot,
  getServerPendingHoldSnapshot,
  subscribePendingHold,
} from '@/lib/pending-hold';

interface SiteHeaderProps {
  signedIn: boolean;
}

const NAV = [
  {
    href: '/',
    label: "What's On",
    match: (path: string) => path === '/' || path.startsWith('/shows'),
  },
  {
    href: '/tickets',
    label: 'My Tickets',
    match: (path: string) => path.startsWith('/tickets') || path.startsWith('/booking'),
  },
] as const;

export function SiteHeader({ signedIn }: SiteHeaderProps) {
  const pathname = usePathname();
  return <HeaderBar key={pathname} signedIn={signedIn} pathname={pathname} />;
}

function HeaderBar({ signedIn, pathname }: { signedIn: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const pending = useSyncExternalStore(
    subscribePendingHold,
    getPendingHoldSnapshot,
    getServerPendingHoldSnapshot,
  );
  const onPendingCheckout = pending ? pathname === checkoutPath(pending.holdId) : false;
  const showBanner = Boolean(pending) && !onPendingCheckout && !pathname.startsWith('/tickets');

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const organiserActive = pathname.startsWith('/organiser');
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-charcoal/8 bg-cream/80 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-charcoal focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="page-wrap flex h-16 items-center justify-between sm:h-[4.25rem]">
        <Link href="/" className="group flex items-center gap-2.5" onClick={close}>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-charcoal text-amber shadow-card"
            aria-hidden="true"
          >
            <span className="font-display text-sm font-bold leading-none">F</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold tracking-tight text-charcoal transition-colors group-hover:text-amber-dark sm:text-2xl">
              FRINGE
            </span>
            <span className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate sm:inline">
              Festival
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              active={item.match(pathname)}
              pending={item.href === '/tickets' && Boolean(pending)}
            >
              {item.label}
            </NavLink>
          ))}
          {signedIn ? (
            <>
              <NavLink href="/organiser" active={organiserActive}>
                Dashboard
              </NavLink>
              <div className="ml-2 border-l border-charcoal/10 pl-3">
                <SignOutButton />
              </div>
            </>
          ) : (
            <NavLink href="/organiser/login" active={pathname.startsWith('/organiser/login')}>
              Organisers
            </NavLink>
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-charcoal hover:bg-charcoal/5 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
        </button>
      </div>

      {showBanner && pending && <PendingHoldBanner hold={pending} />}

      {open && (
        <div id="mobile-nav" className="border-t border-charcoal/8 bg-cream/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={item.match(pathname)}
                pending={item.href === '/tickets' && Boolean(pending)}
                mobile
                onNavigate={close}
              >
                {item.label}
              </NavLink>
            ))}
            {signedIn ? (
              <>
                <NavLink href="/organiser" active={organiserActive} mobile onNavigate={close}>
                  Dashboard
                </NavLink>
                <div className="px-3 py-2">
                  <SignOutButton />
                </div>
              </>
            ) : (
              <NavLink
                href="/organiser/login"
                active={pathname.startsWith('/organiser/login')}
                mobile
                onNavigate={close}
              >
                Organisers
              </NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
  mobile = false,
  pending = false,
  onNavigate,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  mobile?: boolean;
  pending?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      aria-label={pending ? `${String(children)}, pending booking` : undefined}
      onClick={onNavigate}
      className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
        mobile ? 'w-full' : ''
      } ${
        active ? 'bg-charcoal text-white' : 'text-slate hover:bg-charcoal/5 hover:text-charcoal'
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {children}
        {pending && (
          <span
            className={`h-2 w-2 shrink-0 rounded-full animate-pulse-slow ${
              active ? 'bg-amber-light' : 'bg-amber'
            }`}
            aria-hidden="true"
          />
        )}
      </span>
    </Link>
  );
}
