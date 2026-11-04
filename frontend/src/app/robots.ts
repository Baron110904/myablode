import type { MetadataRoute } from 'next';

/**
 * Directives d'exploration.
 *
 * Le site vitrine est public et destiné à être trouvé : on l'ouvre. Le
 * back-office et les pages de service ne le sont pas — ils n'apportent rien
 * dans un résultat de recherche et exposeraient l'adresse de connexion.
 *
 * `Disallow` n'est pas une protection : il demande poliment aux robots
 * respectueux de passer leur chemin. Ce qui protège réellement
 * l'administration, c'est l'authentification.
 */
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api',
          // Désinscription : page personnelle atteinte par jeton.
          '/newsletter/desinscription',
          // Pages de résultats filtrées : même contenu, adresses multiples.
          '/actualites?',
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
