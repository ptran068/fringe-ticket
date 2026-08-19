/**
 * Pricing module — all values in integer minor units (cents).
 * Rounding policy: Math.round (round half-up).
 */

/** Ticket tier definition */
export interface TicketTier {
  id: string;
  label: string;
  percentage: number; // 100 = full price, 67 = concession, 50 = under-26
}

/** A line item in an order */
export interface OrderLineItem {
  tierId: string;
  tierLabel: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

/** Complete order summary */
export interface OrderSummary {
  lineItems: OrderLineItem[];
  subtotalMinor: number;
  feeMinor: number;
  totalMinor: number;
}

/** Calculate unit price for a tier: round(basePrice * percentage / 100) */
export function tierPrice(basePriceMinor: number, percentage: number): number {
  return Math.round((basePriceMinor * percentage) / 100);
}

/** Calculate line total: unitPrice * quantity (no rounding needed, both are ints) */
export function lineTotal(unitPriceMinor: number, quantity: number): number {
  return unitPriceMinor * quantity;
}

/** Booking fee: 6% of subtotal, capped at $9.00 (900 minor units) */
export function bookingFee(subtotalMinor: number): number {
  return Math.min(Math.round((subtotalMinor * 6) / 100), 900);
}

/** Build a complete order summary from selections */
export function calculateOrder(
  basePriceMinor: number,
  tiers: TicketTier[],
  selections: Record<string, number> // tierId -> quantity
): OrderSummary {
  const lineItems: OrderLineItem[] = [];
  let subtotalMinor = 0;

  for (const tier of tiers) {
    const qty = selections[tier.id] ?? 0;
    if (qty <= 0) continue;

    const unitPrice = tierPrice(basePriceMinor, tier.percentage);
    const total = lineTotal(unitPrice, qty);

    lineItems.push({
      tierId: tier.id,
      tierLabel: tier.label,
      quantity: qty,
      unitPriceMinor: unitPrice,
      lineTotalMinor: total,
    });

    subtotalMinor += total;
  }

  const fee = bookingFee(subtotalMinor);

  return {
    lineItems,
    subtotalMinor,
    feeMinor: fee,
    totalMinor: subtotalMinor + fee,
  };
}

/** Format minor units as display price: 2000 -> "$20.00" */
export function formatPrice(minorUnits: number): string {
  const dollars = Math.floor(Math.abs(minorUnits) / 100);
  const cents = Math.abs(minorUnits) % 100;
  const sign = minorUnits < 0 ? '-' : '';
  return `${sign}$${dollars}.${cents.toString().padStart(2, '0')}`;
}
