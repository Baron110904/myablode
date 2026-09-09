/**
 * Politique d'envoi du cookie de session.
 *
 * Une valeur inconnue retombe sur `lax`, le réglage le plus restrictif qui
 * fonctionne en domaine partagé : mieux vaut une session qui ne traverse pas
 * qu'un cookie envoyé partout par erreur de frappe.
 */
function normaliserSameSite(valeur?: string): 'lax' | 'strict' | 'none' {
  const attendu = (valeur ?? '').trim().toLowerCase();
  return attendu === 'none' || attendu === 'strict' || attendu === 'lax'
    ? attendu
    : 'lax';
}

export interface AppConfig {
  env: string;
  port: number;
  corsOrigins: string[];
  db: {
    /** Chaîne complète, prioritaire quand elle est fournie. */
    url?: string;
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
  };
  redis: { host: string; port: number; password?: string };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  cookie: {
    domain: string;
    secure: boolean;
    /** « none » est requis quand le site et l'API ne partagent pas le domaine. */
    sameSite: 'lax' | 'strict' | 'none';
  };
  throttle: { ttl: number; limit: number };
  smtp: {
    host?: string;
    port: number;
    user?: string;
    password?: string;
    from: string;
  };
  kobo: { apiUrl: string; apiToken?: string; formId?: string };
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default (): AppConfig => ({
  env: process.env.NODE_ENV ?? 'development',
  port: toInt(process.env.PORT, 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  db: {
    /*
     * Les hébergeurs de bases infogérées — Neon, Supabase, Railway — livrent
     * une chaîne unique. La découper à la main est la source d'erreur la plus
     * fréquente ; on l'accepte telle quelle et elle prime sur les champs
     * séparés, qui restent pour le développement local.
     */
    url: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST ?? 'localhost',
    port: toInt(process.env.DB_PORT, 5433),
    user: process.env.DB_USER ?? 'ablode',
    password: process.env.DB_PASSWORD ?? 'ablode',
    name: process.env.DB_NAME ?? 'ablode',
    /*
     * Chiffrement de la liaison. Exigé par les bases infogérées, inutile et
     * gênant pour un conteneur local — d'où le réglage explicite plutôt
     * qu'une déduction.
     */
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toInt(process.env.REDIS_PORT, 6380),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  cookie: {
    domain: process.env.COOKIE_DOMAIN ?? 'localhost',
    secure: process.env.COOKIE_SECURE === 'true',
    /*
     * `lax` convient tant que le site et l'API partagent le domaine. Dès
     * qu'ils sont séparés — vitrine sur un hébergeur, API sur un autre — le
     * navigateur cesse d'envoyer le cookie de session et l'administrateur se
     * retrouve déconnecté au premier rechargement, sans message d'erreur.
     * `none` rétablit l'envoi, et impose `secure`.
     */
    sameSite: normaliserSameSite(process.env.COOKIE_SAMESITE),
  },
  throttle: {
    ttl: toInt(process.env.THROTTLE_TTL, 60),
    limit: toInt(process.env.THROTTLE_LIMIT, 100),
  },
  smtp: {
    host: process.env.SMTP_HOST || undefined,
    port: toInt(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || undefined,
    password: process.env.SMTP_PASSWORD || undefined,
    from: process.env.SMTP_FROM ?? 'MyABLODE <no-reply@ablode.bj>',
  },
  kobo: {
    apiUrl: process.env.KOBO_API_URL ?? 'https://kf.kobotoolbox.org',
    apiToken: process.env.KOBO_API_TOKEN || undefined,
    formId: process.env.KOBO_FORM_ID || undefined,
  },
});
