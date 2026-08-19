import { formatPrice } from '@/domain/pricing';

interface PriceProps {
  minor: number;
  className?: string;
  prefix?: string;
}

export function Price({ minor, className = '', prefix }: PriceProps) {
  return (
    <span className={className}>
      {prefix && <span className="text-slate text-sm mr-1">{prefix}</span>}
      {formatPrice(minor)}
    </span>
  );
}
