'use client';

import AuthProvider from '../lib/AuthProvider';
import DataProvider from '../lib/DataProvider';
import ConnBanner from './ConnBanner';

/** Wraps the app with client-side providers (auth, connection status, shared data). */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DataProvider>
        <ConnBanner />
        {children}
      </DataProvider>
    </AuthProvider>
  );
}
