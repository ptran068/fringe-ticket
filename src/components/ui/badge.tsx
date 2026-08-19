type BadgeVariant = 'available' | 'unavailable' | 'sold_out' | 'info' | 'warning' | 'success';

const variantStyles: Record<BadgeVariant, string> = {
  available: 'bg-emerald/10 text-emerald border-emerald/20',
  unavailable: 'bg-amber/10 text-amber-dark border-amber/20',
  sold_out: 'bg-coral/10 text-coral border-coral/20',
  info: 'bg-charcoal/5 text-slate border-charcoal/10',
  warning: 'bg-amber/10 text-amber-dark border-amber/20',
  success: 'bg-emerald/10 text-emerald border-emerald/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'info', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'available'
              ? 'bg-emerald'
              : variant === 'unavailable'
                ? 'bg-amber animate-pulse-slow'
                : variant === 'sold_out'
                  ? 'bg-coral'
                  : 'bg-slate'
          }`}
        />
      )}
      {children}
    </span>
  );
}
