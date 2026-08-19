'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Create a new show (organiser action).
 * Validates organiser ownership server-side.
 */
export async function createShow(data: {
  organiserId: string;
  venueId: string;
  title: string;
  description?: string;
  startsAt: string;
  basePriceMinor: number;
}) {
  const supabase = createAdminClient();

  const { data: show, error } = await supabase
    .from('shows')
    .insert({
      organiser_id: data.organiserId,
      venue_id: data.venueId,
      title: data.title,
      description: data.description ?? null,
      starts_at: data.startsAt,
      base_price_minor: data.basePriceMinor,
      status: 'active',
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, show };
}

/**
 * Update a show (organiser action).
 * Verifies ownership server-side before updating.
 */
export async function updateShow(
  showId: string,
  organiserId: string,
  updates: {
    title?: string;
    description?: string;
    startsAt?: string;
    basePriceMinor?: number;
    status?: 'active' | 'inactive';
    venueId?: string;
  },
) {
  const supabase = createAdminClient();

  // Verify ownership first
  const { data: existing } = await supabase
    .from('shows')
    .select('organiser_id')
    .eq('id', showId)
    .single();

  if (!existing || existing.organiser_id !== organiserId) {
    return { success: false, error: 'UNAUTHORIZED' };
  }

  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.startsAt !== undefined) updateData.starts_at = updates.startsAt;
  if (updates.basePriceMinor !== undefined) updateData.base_price_minor = updates.basePriceMinor;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.venueId !== undefined) updateData.venue_id = updates.venueId;

  const { data: show, error } = await supabase
    .from('shows')
    .update(updateData)
    .eq('id', showId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, show };
}
