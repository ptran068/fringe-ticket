'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  getServerWalletSnapshot,
  getServerWalletWriteSnapshot,
  getWalletSnapshot,
  getWalletWriteSnapshot,
  saveWalletTicket,
  subscribeWallet,
  type WalletTicketInput,
} from '@/lib/ticket-wallet';

interface SaveTicketProps {
  ticket: WalletTicketInput;
}

export function SaveTicket({ ticket }: SaveTicketProps) {
  useEffect(() => {
    saveWalletTicket(ticket);
  }, [ticket]);

  const tickets = useSyncExternalStore(subscribeWallet, getWalletSnapshot, getServerWalletSnapshot);
  const lastWrite = useSyncExternalStore(
    subscribeWallet,
    getWalletWriteSnapshot,
    getServerWalletWriteSnapshot,
  );
  const saved = tickets.some((item) => item.bookingId === ticket.bookingId);
  const failed = lastWrite?.bookingId === ticket.bookingId && !lastWrite.result.ok;

  if (failed) {
    return (
      <p className="text-xs text-slate" role="status">
        This ticket could not be saved on this device. Keep this page or the booking reference.
      </p>
    );
  }

  return (
    <p className="text-xs text-slate" role="status">
      {saved ? 'Saved to My Tickets on this device.' : 'Saving to this device…'}
    </p>
  );
}
