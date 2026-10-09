import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// No Content-Security-Policy yet: Next injects inline scripts that would need a
// per-request nonce, which is a change of its own.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // The invitation token travels in the path (/invite/<token>): a full Referer
  // would hand it to every third-party resource that page loads.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default createNextIntlPlugin()(nextConfig);
