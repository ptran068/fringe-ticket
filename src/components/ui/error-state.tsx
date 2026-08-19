'use client';

import { Button } from './button';
import { IconAlert } from './icons';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this content. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10">
        <IconAlert className="h-8 w-8 text-coral" />
      </div>
      <h3 className="font-display text-xl font-bold text-charcoal">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate">{description}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
