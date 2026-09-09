const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content-Security-Policy : les tuiles OpenStreetMap et les images distantes
 * sont autorisées, tout le reste est restreint à l'origine (section 6.2 XSS).
 */
const csp = [
  "default-src 'self'",
  // Next.js injecte des scripts inline pour l'hydratation.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}`,
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /*
   * Image de production autonome : Next rassemble le serveur et les seules
   * dépendances réellement utilisées. Sans cela, il faudrait embarquer tout
   * `node_modules` dans le conteneur — plusieurs centaines de mégaoctets.
   */
  /*
   * Réservé à la construction Docker : Vercel gère lui-même l'empaquetage et
   * n'a que faire de ce mode. Le Dockerfile pose `BUILD_STANDALONE=true`.
   */
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
