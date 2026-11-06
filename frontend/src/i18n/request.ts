import { getRequestConfig } from 'next-intl/server';
import { typographieFrProfonde } from '@/lib/format';
import { langueDuSite } from './config';

/**
 * Le site est servi en français, langue de travail de l'association et de son
 * public. Voir `config.ts` pour activer la détection automatique depuis le
 * navigateur si l'ABLODE souhaite un jour exposer l'anglais.
 */
export default getRequestConfig(async () => {
  const locale = langueDuSite();
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    /*
     * Les traductions suivent la même règle typographique que les textes
     * venus de l'API : « tous dépistés ! » ne doit pas laisser le point
     * d'exclamation passer seul à la ligne. La règle est française, donc
     * appliquée au seul français - l'anglais ne met pas d'espace devant ses
     * signes doubles.
     */
    messages: locale === 'fr' ? typographieFrProfonde(messages) : messages,
    timeZone: 'Africa/Porto-Novo',
    now: new Date(),
  };
});
