import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Logo } from './Logo';
import { ReseauxSociaux } from './ReseauxSociaux';
import { ASSOCIATION, lienTelephone } from '@/lib/association';

export function PiedDePage() {
  const t = useTranslations('pied');
  const tNav = useTranslations('nav');
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-ablode-nuit text-white">
      <div className="conteneur py-14">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <Logo taille={38} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              {t('association')}
            </p>
            <address className="mt-4 space-y-1 text-sm not-italic leading-relaxed text-white/60">
              <p>{ASSOCIATION.adresse}</p>
              <p>
                {ASSOCIATION.ville}, {ASSOCIATION.pays}
              </p>
              <p className="pt-1.5">
                {ASSOCIATION.telephones.map((numero, index) => (
                  <span key={numero}>
                    {index > 0 && <span aria-hidden className="text-ablode-trait"> · </span>}
                    <a
                      href={lienTelephone(numero)}
                      className="font-mono text-[0.8125rem] text-white transition-colors hover:text-ablode-vert-clair"
                    >
                      {numero}
                    </a>
                  </span>
                ))}
              </p>
            </address>

            <div className="mt-6">
              <p className="etiquette mb-3 !text-white/45">{t('suivre')}</p>
              <ReseauxSociaux taille={20} variante="sombre" />
            </div>
          </div>

          <nav aria-label={t('navigation')}>
            <p className="etiquette mb-4 !text-white/45">{t('navigation')}</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/carte" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('carte')}
                </Link>
              </li>
              <li>
                <Link href="/resultats" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('resultats')}
                </Link>
              </li>
              <li>
                <Link href="/actualites" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('actualites')}
                </Link>
              </li>
              <li>
                <Link href="/a-propos" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('aPropos')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('association2')}>
            <p className="etiquette mb-4 !text-white/45">{t('association2')}</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/contact" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('contact')}
                </Link>
              </li>
              <li>
                <Link href="/benevole" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  Devenir bénévole
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {t('mentions')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-white/40">
            © {annee} ABLODE — {t('droits')}
          </p>
          <p className="text-[0.6875rem] text-white/40">{t('sourceDonnees')}</p>
        </div>
      </div>
    </footer>
  );
}
