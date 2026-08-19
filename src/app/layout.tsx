import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from '@/components/organiser/sign-out-button';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'FRINGE — Festival Tickets',
  description: 'Discover and book tickets for independent theatre, dance, and performance.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen bg-cream text-charcoal antialiased">
        <header className="border-b border-charcoal/5 bg-white/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-charcoal group-hover:text-amber-dark transition-colors">
                FRINGE
              </span>
              <span className="hidden sm:inline text-xs font-medium text-slate uppercase tracking-widest mt-1">
                Festival
              </span>
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-slate hover:text-charcoal transition-colors"
              >
                What&apos;s On
              </Link>
              <Link
                href="/tickets"
                className="text-sm font-medium text-slate hover:text-charcoal transition-colors"
              >
                My Tickets
              </Link>
              {user ? (
                <>
                  <Link
                    href="/organiser"
                    className="text-sm font-medium text-slate hover:text-charcoal transition-colors"
                  >
                    Dashboard
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/organiser/login"
                  className="text-sm font-medium text-slate hover:text-charcoal transition-colors"
                >
                  Organisers
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="animate-fade-in">{children}</main>
        <footer className="border-t border-charcoal/5 mt-20 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs text-slate text-center">
              © 2026 Fringe Festival · Independent theatre, dance &amp; performance
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
