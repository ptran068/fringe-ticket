'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
}

export function Pagination({ page, totalPages, total }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(p));
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center justify-between pt-8">
      <p className="text-sm text-slate">
        Page {page} of {totalPages} · {total} show{total !== 1 ? 's' : ''}
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
          ← Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
          Next →
        </Button>
      </div>
    </div>
  );
}
