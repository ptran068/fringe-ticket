import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { createClient } from '@/lib/supabase/server';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
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
      <body className="flex min-h-screen flex-col bg-cream text-charcoal antialiased">
        <SiteHeader signedIn={Boolean(user)} />
        <main id="main" className="flex-1 animate-fade-in">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
