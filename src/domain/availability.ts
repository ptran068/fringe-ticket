/** Availability status for a show */
export type AvailabilityStatus = 'available' | 'temporarily_unavailable' | 'sold_out';

export interface ShowAvailability {
  capacity: number;
  sold: number;
  held: number;
  available: number;
  status: AvailabilityStatus;
}

/** Calculate availability from capacity, sold, and held counts */
export function calculateAvailability(
  capacity: number,
  sold: number,
  held: number,
): ShowAvailability {
  const available = Math.max(0, capacity - sold - held);

  let status: AvailabilityStatus;
  if (sold >= capacity) {
    status = 'sold_out';
  } else if (available === 0) {
    status = 'temporarily_unavailable';
  } else {
    status = 'available';
  }

  return { capacity, sold, held, available, status };
}

/** True when a customer can actually complete a hold for minSeats tickets. */
export function isGenuinelyBookable(availability: ShowAvailability, minSeats = 1): boolean {
  return availability.status === 'available' && availability.available >= minSeats;
}

/** Human-readable availability label */
export function availabilityLabel(availability: ShowAvailability): string {
  switch (availability.status) {
    case 'sold_out':
      return 'Sold out';
    case 'temporarily_unavailable':
      return 'Temporarily held — try again shortly';
    case 'available':
      return `${availability.available} ticket${availability.available === 1 ? '' : 's'} left`;
  }
}
