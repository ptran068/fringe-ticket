import { Badge } from './badge';
import type { ShowAvailability } from '@/types/domain';
import { availabilityLabel } from '@/domain/availability';

interface AvailabilityBadgeProps {
  availability: ShowAvailability;
  className?: string;
}

export function AvailabilityBadge({ availability, className = '' }: AvailabilityBadgeProps) {
  const variant =
    availability.status === 'available'
      ? 'available'
      : availability.status === 'temporarily_unavailable'
        ? 'unavailable'
        : 'sold_out';

  return (
    <Badge variant={variant} dot className={className}>
      {availabilityLabel(availability)}
    </Badge>
  );
}
