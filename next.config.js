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
  async rewrites() {
    return isProd ? [] : [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/accounts/:path*',
        destination: 'http://localhost:8000/accounts/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
