import { IconSearch } from '@/components/ui/icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-charcoal/12 bg-white/50 px-4 py-16 text-center animate-fade-in">
      {icon ? (
        icon
      ) : (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-charcoal/5">
          <IconSearch className="h-8 w-8 text-slate-light" />
        </div>
      )}
      <h3 className="font-display text-xl font-bold text-charcoal">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
