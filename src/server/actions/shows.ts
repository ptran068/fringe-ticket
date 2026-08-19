'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fromVenueDatetimeLocal } from '@/domain/time';

export async function createShow(data: {
  venueId: string;
  title: string;
  description?: string;
  startsAtLocal: string;
  timezone: string;
  basePriceMinor: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: 'UNAUTHENTICATED' };

  let startsAt: string;
  try {
    startsAt = fromVenueDatetimeLocal(data.startsAtLocal, data.timezone);
  } catch {
    return { success: false as const, error: 'INVALID_DATETIME' };
  }

  const { data: show, error } = await supabase
    .from('shows')
    .insert({
      organiser_id: user.id,
      venue_id: data.venueId,
      title: data.title,
      description: data.description ?? null,
      starts_at: startsAt,
      base_price_minor: data.basePriceMinor,
      status: 'active',
    })
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };

  revalidatePath('/organiser');
  revalidatePath('/');
  return { success: true as const, show };
}

export async function updateShow(
  showId: string,
  updates: {
    title?: string;
    description?: string;
    startsAtLocal?: string;
    timezone?: string;
    basePriceMinor?: number;
    status?: 'active' | 'inactive';
    venueId?: string;
  },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false as const, error: 'UNAUTHENTICATED' };

  const updateData: {
    title?: string;
    description?: string | null;
    starts_at?: string;
    base_price_minor?: number;
    status?: 'active' | 'inactive';
    venue_id?: string;
  } = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.basePriceMinor !== undefined) updateData.base_price_minor = updates.basePriceMinor;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.venueId !== undefined) updateData.venue_id = updates.venueId;
  if (updates.startsAtLocal && updates.timezone) {
    try {
      updateData.starts_at = fromVenueDatetimeLocal(updates.startsAtLocal, updates.timezone);
    } catch {
      return { success: false as const, error: 'INVALID_DATETIME' };
    }
  }

  // No organiser_id filter. RLS using (organiser_id = auth.uid()) is the gate.
  const { data: show, error } = await supabase
    .from('shows')
    .update(updateData)
    .eq('id', showId)
    .select()
    .single();

  if (error) return { success: false as const, error: error.message };
  if (!show) return { success: false as const, error: 'UNAUTHORIZED' };

  revalidatePath('/organiser');
  revalidatePath('/');
  revalidatePath(`/shows/${showId}`);
  return { success: true as const, show };
}
