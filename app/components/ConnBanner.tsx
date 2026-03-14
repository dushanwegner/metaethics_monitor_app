'use client';

import { usePathname } from 'next/navigation';
import { getApiBase } from '../lib/api';
import { useAuth } from '../lib/AuthProvider';

/**
 * Thin banner at the top of the app when offline or in error state.
 * Tapping it triggers a session re-check.
 * Hidden on /login — the login form handles its own errors.
 */
export default function ConnBanner() {
  const { connStatus, authStatus, checkSession } = useAuth();
  const pathname = usePathname();

  // Don't show on login page — form handles its own errors
  if (pathname === '/login') return null;

  if (connStatus === 'online' && authStatus !== 'checking') return null;

  let text = '';
  let variant = '';

  // Strip protocol for compact display
  const serverHost = getApiBase().replace(/^https?:\/\//, '');

  if (connStatus === 'offline') {
    text = `Offline — ${serverHost} — tap to retry`;
    variant = 'conn-banner--offline';
  } else if (connStatus === 'error') {
    text = `Can't reach ${serverHost} — tap to retry`;
    variant = 'conn-banner--error';
  } else if (authStatus === 'checking') {
    text = 'Checking session...';
    variant = 'conn-banner--checking';
  }

  if (!text) return null;

  return (
    <button className={`conn-banner ${variant}`} onClick={checkSession}>
      {text}
    </button>
  );
}
