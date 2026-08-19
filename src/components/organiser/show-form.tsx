'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createShow, updateShow } from '@/server/actions/shows';
import { toVenueDatetimeLocal } from '@/domain/time';
import type { Show, Venue } from '@/types/domain';

interface ShowFormProps {
  venues: Venue[];
  show?: Show;
}

export function ShowForm({ venues, show }: ShowFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [venueId, setVenueId] = useState(show?.venue_id ?? venues[0]?.id ?? '');

  const selectedVenue = venues.find((v) => v.id === venueId) ?? venues[0];
  const defaultLocal = show ? toVenueDatetimeLocal(show.starts_at, show.venues.timezone) : '';

  const handleSubmit = (formData: FormData) => {
    const title = String(formData.get('title') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim();
    const startsAtLocal = String(formData.get('startsAtLocal') ?? '');
    const dollars = Number(formData.get('priceDollars'));
    const status = String(formData.get('status') ?? 'active') as 'active' | 'inactive';

    if (!title || !startsAtLocal || !selectedVenue) {
      setError('Title, venue, and start time are required.');
      return;
    }

    const basePriceMinor = Math.round(dollars * 100);
    if (!Number.isFinite(basePriceMinor) || basePriceMinor < 0) {
      setError('Price must be a valid amount.');
      return;
    }

    startTransition(async () => {
      const result = show
        ? await updateShow(show.id, {
            title,
            description: description || undefined,
            startsAtLocal,
            timezone: selectedVenue.timezone,
            basePriceMinor,
            status,
            venueId: selectedVenue.id,
          })
        : await createShow({
            venueId: selectedVenue.id,
            title,
            description: description || undefined,
            startsAtLocal,
            timezone: selectedVenue.timezone,
            basePriceMinor,
          });

      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push('/organiser');
      router.refresh();
    });
  };

  return (
    <form
      action={handleSubmit}
      className="bg-white rounded-xl border border-charcoal/5 p-6 shadow-card space-y-4 max-w-xl"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-charcoal mb-1">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={show?.title}
          className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-charcoal mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={show?.description ?? ''}
          className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="venueId" className="block text-sm font-medium text-charcoal mb-1">
          Venue
        </label>
        <select
          id="venueId"
          name="venueId"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}, {v.city} ({v.timezone})
            </option>
          ))}
        </select>
        <p className="text-xs text-slate mt-1">
          Start time is stored in UTC and shown in {selectedVenue?.timezone}.
        </p>
      </div>
      <div>
        <label htmlFor="startsAtLocal" className="block text-sm font-medium text-charcoal mb-1">
          Starts at (venue local)
        </label>
        <input
          id="startsAtLocal"
          name="startsAtLocal"
          type="datetime-local"
          required
          defaultValue={defaultLocal}
          className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="priceDollars" className="block text-sm font-medium text-charcoal mb-1">
          Base price (dollars)
        </label>
        <input
          id="priceDollars"
          name="priceDollars"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={show ? (show.base_price_minor / 100).toFixed(2) : '20.00'}
          className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      {show && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-charcoal mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={show.status}
            className="w-full border border-charcoal/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}
      {error && (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={isPending}>
        {show ? 'Save changes' : 'Create show'}
      </Button>
    </form>
  );
}
