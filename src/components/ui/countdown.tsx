'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatCountdown } from '@/domain/time';

interface CountdownProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

/**
 * Countdown timer using server-authoritative expiry timestamp.
 * Calculates remaining time client-side from the fixed expires_at.
 * Does NOT poll the database — uses the immutable DB timestamp as source of truth.
 */
export function Countdown({ expiresAt, onExpire, className = '' }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => {
    return new Date(expiresAt).getTime() - Date.now();
  });

  const isExpired = remaining <= 0;
  const isUrgent = remaining > 0 && remaining < 2 * 60 * 1000;

  const handleExpire = useCallback(() => {
    onExpire?.();
  }, [onExpire]);

  useEffect(() => {
    if (isExpired) {
      handleExpire();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const diff = target - now;

      setRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
        handleExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isExpired, handleExpire]);

  if (isExpired) {
    return (
      <div className={`font-semibold text-coral ${className}`} role="timer" aria-live="assertive">
        Expired
      </div>
    );
  }

  const [minutes, seconds] = formatCountdown(remaining).split(':');

  return (
    <div
      className={className}
      role="timer"
      aria-live="polite"
      aria-label={`${formatCountdown(remaining)} remaining`}
    >
      <div className="flex items-end justify-center gap-2">
        <TimeBlock value={minutes} label="min" urgent={isUrgent} />
        <span
          className={`pb-3 font-mono text-2xl font-bold ${isUrgent ? 'text-coral' : 'text-amber-dark'}`}
        >
          :
        </span>
        <TimeBlock value={seconds} label="sec" urgent={isUrgent} />
      </div>
    </div>
  );
}

function TimeBlock({ value, label, urgent }: { value: string; label: string; urgent: boolean }) {
  return (
    <div className="min-w-[4.5rem]">
      <div
        className={`rounded-xl px-3 py-2 font-mono text-3xl font-bold tabular-nums tracking-wider ${
          urgent ? 'bg-coral/10 text-coral animate-pulse-slow' : 'bg-amber/10 text-amber-dark'
        }`}
      >
        {value}
      </div>
      <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-wider text-slate">
        {label}
      </p>
    </div>
  );
}
