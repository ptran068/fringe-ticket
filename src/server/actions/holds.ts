'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { CreateHoldResult, ConfirmHoldResult } from '@/types/domain';

/**
 * Create a ticket hold via atomic Postgres RPC.
 *
 * The RPC function uses SELECT ... FOR UPDATE on the show row to serialize
 * concurrent hold requests. This guarantees:
 *   confirmed + active_holds <= capacity
 *
 * The database is the sole authority — React never decides if a hold is allowed.
 */
export async function createHold(
  showId: string,
  items: { tier_id: string; quantity: number }[],
  customerName?: string,
  customerEmail?: string,
): Promise<CreateHoldResult> {
  // Validate inputs server-side
  if (!showId) return { success: false, error: 'INVALID_SHOW' };
  if (!items || items.length === 0) return { success: false, error: 'NO_ITEMS' };

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQty <= 0) return { success: false, error: 'INVALID_QUANTITY' };

  // Filter out zero-quantity items
  const filteredItems = items.filter((item) => item.quantity > 0);

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc('create_hold', {
      p_show_id: showId,
      p_items: filteredItems,
      p_customer_name: customerName ?? null,
      p_customer_email: customerEmail ?? null,
    });

    if (error) {
      // Map database errors to domain errors
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

/**
 * Confirm a hold into a booking via atomic Postgres RPC.
 *
 * The RPC function locks the hold row with SELECT ... FOR UPDATE and checks:
 * 1. Hold exists and is active
 * 2. Hold has not expired (expires_at > now() — DB timestamp is authoritative)
 * 3. Creates the booking atomically
 *
 * This handles the race condition where a hold expires at the exact moment
 * of confirmation — the DB transaction decides the winner deterministically.
 */
export async function confirmHold(
  holdId: string,
  customerName?: string,
  customerEmail?: string,
): Promise<ConfirmHoldResult> {
  if (!holdId) return { success: false, error: 'INVALID_HOLD' };

  const supabase = createAdminClient();

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
