'use server';

import { createAnonClient } from '@/lib/supabase/anon';
import type { CreateHoldResult, ConfirmHoldResult } from '@/types/domain';

/**
 * Create a ticket hold via atomic Postgres RPC.
 * Called with the anon key — table INSERT on holds is revoked, so the
 * only path is this SECURITY DEFINER function (SELECT … FOR UPDATE).
 */
export async function createHold(
  showId: string,
  items: { tier_id: string; quantity: number }[],
  customerName?: string,
  customerEmail?: string,
): Promise<CreateHoldResult> {
  if (!showId) return { success: false, error: 'INVALID_SHOW' };
  if (!items || items.length === 0) return { success: false, error: 'NO_ITEMS' };

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQty <= 0) return { success: false, error: 'INVALID_QUANTITY' };

  const filteredItems = items.filter((item) => item.quantity > 0);
  const supabase = createAnonClient();

  try {
    const { data, error } = await supabase.rpc('create_hold', {
      p_show_id: showId,
      p_items: filteredItems,
      p_customer_name: customerName ?? null,
      p_customer_email: customerEmail ?? null,
    });

    if (error) {
      if (error.message.includes('INSUFFICIENT_INVENTORY')) {
        return { success: false, error: 'INSUFFICIENT_INVENTORY' };
      }
      if (error.message.includes('SHOW_NOT_FOUND')) {
        return { success: false, error: 'SHOW_NOT_FOUND' };
      }
      if (error.message.includes('INVALID_QUANTITY')) {
        return { success: false, error: 'INVALID_QUANTITY' };
      }
      return { success: false, error: error.message };
    }

    return data as CreateHoldResult;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function confirmHold(
  holdId: string,
  customerName?: string,
  customerEmail?: string,
): Promise<ConfirmHoldResult> {
  if (!holdId) return { success: false, error: 'INVALID_HOLD' };

  const supabase = createAnonClient();

  try {
    const { data, error } = await supabase.rpc('confirm_hold', {
      p_hold_id: holdId,
      p_customer_name: customerName ?? null,
      p_customer_email: customerEmail ?? null,
    });

    if (error) {
      if (error.message.includes('HOLD_EXPIRED')) {
        return { success: false, error: 'HOLD_EXPIRED' };
      }
      if (error.message.includes('HOLD_NOT_FOUND')) {
        return { success: false, error: 'HOLD_NOT_FOUND' };
      }
      if (error.message.includes('HOLD_NOT_ACTIVE')) {
        return { success: false, error: 'HOLD_NOT_ACTIVE' };
      }
      return { success: false, error: error.message };
    }

    return data as ConfirmHoldResult;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
