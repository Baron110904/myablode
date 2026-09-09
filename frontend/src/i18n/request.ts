import { getRequestConfig } from 'next-intl/server';
import { langueDuSite } from './config';

/**
 * Le site est servi en français, langue de travail de l'association et de son
 * public. Voir `config.ts` pour activer la détection automatique depuis le
 * navigateur si l'ABLODE souhaite un jour exposer l'anglais.
 */
export default getRequestConfig(async () => {
  const locale = langueDuSite();

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Africa/Porto-Novo',
    now: new Date(),
  };
});
