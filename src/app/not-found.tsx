import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-charcoal mb-2">
        Not found
      </h1>
      <p className="text-slate mb-6">That page does not exist, or you do not have access to it.</p>
      <Link href="/">
        <Button variant="secondary">Back to shows</Button>
      </Link>
    </div>
  );
}
