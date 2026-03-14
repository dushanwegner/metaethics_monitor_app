import type { Metadata, Viewport } from 'next';
import './styles/index.scss';
import StatusBarInit from './components/StatusBarInit';
import ClientProviders from './components/ClientProviders';

export const metadata: Metadata = {
  title: 'Metaethics Monitor',
  description: 'AI publishing house monitor',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#181818',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StatusBarInit />
        <ClientProviders>
          <main>{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
