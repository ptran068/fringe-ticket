import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-charcoal/8 bg-charcoal text-cream">
      <div className="page-wrap grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-bold">FRINGE</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-cream/65">
            Independent theatre, dance, and performance. Tickets held for ten minutes, confirmed in
            one tap.
          </p>
        </div>
        <div>
          <p className="kicker !text-amber">Explore</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/" className="text-cream/80 transition-colors hover:text-cream">
                What&apos;s On
              </Link>
            </li>
            <li>
              <Link href="/tickets" className="text-cream/80 transition-colors hover:text-cream">
                My Tickets
              </Link>
            </li>
            <li>
              <Link
                href="/organiser/login"
                className="text-cream/80 transition-colors hover:text-cream"
              >
                Organiser sign in
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="kicker !text-amber">At the door</p>
          <p className="mt-3 text-sm leading-relaxed text-cream/65">
            Show the QR code from My Tickets. Bookings stay on this device until you clear site
            data.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="page-wrap py-5 text-center text-xs text-cream/45 sm:text-left">
          © 2026 Fringe Festival · Independent theatre, dance &amp; performance
        </p>
      </div>
    </footer>
  );
}
