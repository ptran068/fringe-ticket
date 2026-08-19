'use client';

import { useEffect, useId, useState } from 'react';
import { QrCode } from '@/components/tickets/qr-code';
import { Button } from '@/components/ui/button';
import { renderTicketQrSvg } from '@/lib/qr';

interface TicketPassProps {
  payload: string;
  reference: string;
  svg?: string;
  size?: 'md' | 'lg';
}

export function TicketPass({ payload, reference, svg: svgProp, size = 'lg' }: TicketPassProps) {
  const [generatedSvg, setGeneratedSvg] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const titleId = useId();
  const svg = svgProp ?? generatedSvg;

  useEffect(() => {
    if (svgProp) return;

    let cancelled = false;
    renderTicketQrSvg(payload).then((next) => {
      if (!cancelled) setGeneratedSvg(next);
    });
    return () => {
      cancelled = true;
    };
  }, [payload, svgProp]);

  useEffect(() => {
    if (!enlarged) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEnlarged(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [enlarged]);

  const frameClass = size === 'lg' ? 'w-56 sm:w-64' : 'w-40';

  return (
    <>
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => setEnlarged(true)}
          className={`${frameClass} rounded-xl border border-charcoal/10 bg-white p-3 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer`}
          aria-label={`Enlarge QR code for ${reference}`}
        >
          {svg ? (
            <QrCode svg={svg} label={`QR code for booking ${reference}`} />
          ) : (
            <div className="aspect-square rounded-md bg-ghost animate-pulse" aria-hidden="true" />
          )}
        </button>
        <p className="mt-3 font-mono text-sm font-bold tracking-wider text-amber-dark">
          {reference}
        </p>
        <p className="mt-1 text-xs text-slate">Show this code at the door</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEnlarged(true)}>
          Enlarge for scanning
        </Button>
      </div>

      {enlarged && svg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setEnlarged(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-elevated"
            onClick={(event) => event.stopPropagation()}
          >
            <p
              id={titleId}
              className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate"
            >
              Ready to scan
            </p>
            <QrCode svg={svg} label={`QR code for booking ${reference}`} className="mx-auto w-64" />
            <p className="mt-4 font-mono text-lg font-bold tracking-wider text-amber-dark">
              {reference}
            </p>
            <Button variant="secondary" className="mt-6 w-full" onClick={() => setEnlarged(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
