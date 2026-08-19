import type { Metadata } from 'next';
import { TicketWallet } from '@/components/tickets/ticket-wallet';

export const metadata: Metadata = {
  title: 'My Tickets — FRINGE',
  description: 'Show saved festival tickets from this device at the door.',
};

export default function TicketsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal sm:text-4xl">
          My Tickets
        </h1>
        <p className="mt-2 max-w-lg text-slate">
          Tickets confirmed in this browser are stored on this device so you can show the QR code at
          the door. Clearing site data will remove them.
        </p>
      </div>
      <TicketWallet />
    </div>
  );
}
