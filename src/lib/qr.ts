import QRCode from 'qrcode';

/** High-contrast SVG QR. Medium ECC is enough for a short payload. */
export async function renderTicketQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
  });
}
