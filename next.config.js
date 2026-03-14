/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  reactStrictMode: true,
  // Static export for Capacitor builds only. In dev mode, Next.js server
  // handles rewrites to proxy API calls to Django (same-origin cookies).
  ...(isProd ? { output: 'export' } : {}),
  images: {
    unoptimized: true
  },
  // Proxy API calls to Django in dev mode (next dev).
  // This makes same-origin cookies work in the browser.
  // In production (Capacitor), native HTTP handles cookies directly.
  // Django requires trailing slashes. Next.js strips them before rewrites,
  // so we match both patterns and ensure the destination always has one.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return isProd ? [] : [
      // Match /api/something/ (with trailing slash) — forward as-is
      {
        source: '/api/:path*/',
        destination: 'http://localhost:8000/api/:path*/',
      },
      // Match /api/something (no trailing slash) — add one
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*/',
      },
      // Same for accounts
      {
        source: '/accounts/:path*/',
        destination: 'http://localhost:8000/accounts/:path*/',
      },
      {
        source: '/accounts/:path*',
        destination: 'http://localhost:8000/accounts/:path*/',
      },
    ];
  },
};

module.exports = nextConfig;
