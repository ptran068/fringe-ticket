'use client';

import { ErrorState } from '@/components/ui/error-state';

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="page-wrap py-16">
      <ErrorState
        title="Something went wrong"
        description={
          error.digest
            ? `We couldn't load this page. Reference ${error.digest}.`
            : "We couldn't load this page. Please try again."
        }
        onRetry={retry}
      />
    </div>
  );
}
