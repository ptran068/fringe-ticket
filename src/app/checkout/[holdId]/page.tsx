import { notFound } from 'next/navigation';
import { getHold } from '@/server/repositories/shows';
import { CheckoutClient } from '@/components/checkout/checkout-client';

interface CheckoutPageProps {
  params: Promise<{ holdId: string }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { holdId } = await params;
  const hold = await getHold(holdId);

  if (!hold) notFound();

  return (
    <div className="page-wrap max-w-2xl py-8 sm:py-12">
      <CheckoutClient hold={hold} />
    </div>
  );
}
