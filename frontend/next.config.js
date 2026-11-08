const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Content-Security-Policy : les tuiles OpenStreetMap et les images distantes
 * sont autorisées, tout le reste est restreint à l'origine (section 6.2 XSS).
 */
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const csp = [
  "default-src 'self'",
  // Next.js injecte des scripts inline pour l'hydratation.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // L'API sert aussi les miniatures des vidéos déposées au back-office.
  `img-src 'self' data: blob: ${api} https://tile.openstreetmap.org https://*.tile.openstreetmap.org`,
  /*
   * Les vidéos de la rubrique Actualités sont servies par l'API, sur un autre
   * domaine qu'en production. Sans `media-src`, elles retombent sur
   * `default-src 'self'` et le lecteur reste noir, sans erreur visible
   * ailleurs que dans la console.
   */
  `media-src 'self' blob: ${api}`,
  "font-src 'self' data:",
  `connect-src 'self' ${api}`,
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
  /*
   * Les fichiers déposés au back-office sont servis par l'API, qui vit sur un
   * autre hôte que le site. Les adresser directement inscrivait cet hôte dans
   * le HTML envoyé au navigateur : l'image n'apparaissait que depuis la
   * machine où tourne l'API, et nulle part ailleurs - un téléphone du même
   * réseau lisant `localhost` comme étant lui-même. En production, le site
   * étant servi en HTTPS, le navigateur refusait de surcroît une source en
   * HTTP. Le site les relaie donc depuis sa propre origine : l'adresse écrite
   * dans la page devient relative et vaut depuis n'importe quel appareil.
   */
  async rewrites() {
    return [
      { source: '/uploads/:chemin*', destination: `${api}/uploads/:chemin*` },
    ];
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
