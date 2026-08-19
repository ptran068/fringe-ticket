import { describe, it, expect } from 'vitest';
import { encodeTicketQr } from '@/domain/ticket';
import { renderTicketQrSvg } from '@/lib/qr';

describe('ticket QR rendering', () => {
  it('renders an svg for a booking payload', async () => {
    const payload = encodeTicketQr({
      reference: 'FRG-45A717',
      bookingId: 'e613c5e3-adec-4497-9195-f9d25c1fb362',
    });
    const svg = await renderTicketQrSvg(payload);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });
});
