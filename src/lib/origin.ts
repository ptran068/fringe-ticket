import { headers } from 'next/headers';

/** Public origin for camera-scannable ticket URLs. */
export async function getRequestOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;

  const headerList = await headers();
  const host = (headerList.get('x-forwarded-host') ?? headerList.get('host'))?.split(',')[0].trim();
  if (!host) return 'http://localhost:3000';

  const forwardedProto = headerList.get('x-forwarded-proto')?.split(',')[0].trim();
  const proto =
    forwardedProto ||
    (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');

  return `${proto}://${host}`;
}
