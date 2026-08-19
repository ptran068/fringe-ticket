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
  const isUrgent = remaining > 0 && remaining < 2 * 60 * 1000; // < 2 min

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
      <div className={`text-coral font-semibold ${className}`} role="timer" aria-live="assertive">
        Expired
      </div>
    );
  }

  return (
    <div
      className={`
        font-mono font-bold text-2xl tabular-nums tracking-wider
        ${isUrgent ? 'text-coral animate-pulse-slow' : 'text-amber-dark'}
        ${className}
      `}
      role="timer"
      aria-live="polite"
      aria-label={`${formatCountdown(remaining)} remaining`}
    >
      {formatCountdown(remaining)}
    </div>
  );
}
