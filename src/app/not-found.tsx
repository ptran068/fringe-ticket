import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="page-wrap max-w-lg py-20 text-center">
      <p className="kicker mb-3">404</p>
      <h1 className="font-display text-3xl font-bold text-charcoal sm:text-4xl">Not found</h1>
      <p className="mt-3 text-slate">That page does not exist, or you do not have access to it.</p>
      <Link href="/" className="mt-6 inline-flex">
        <Button variant="secondary">Back to shows</Button>
      </Link>
    </div>
  );
}
