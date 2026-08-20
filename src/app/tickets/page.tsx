import type { Metadata } from 'next';
import { TicketWallet } from '@/components/tickets/ticket-wallet';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = {
  title: 'My Tickets — FRINGE',
  description: 'Show saved festival tickets from this device at the door.',
};

export default function TicketsPage() {
  return (
    <div className="page-wrap max-w-2xl py-8 sm:py-12">
      <PageHeader
        kicker="At the door"
        title="My Tickets"
        description="Pending reservations stay here so you can finish checkout. Confirmed tickets on this device show the QR code at the door."
      />
      <TicketWallet />
    </div>
  );
}
