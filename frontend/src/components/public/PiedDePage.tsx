import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Logo } from './Logo';
import { ReseauxSociaux } from './ReseauxSociaux';
import { ASSOCIATION, lienTelephone } from '@/lib/association';

/**
 * Pied de page du site vitrine.
 *
 * Quatre colonnes : l'identité à gauche, puis le contact et les deux séries
 * de liens. L'adresse reste sous la présentation de l'association, dont elle
 * fait partie : la détacher en colonne la mettait au même rang que les
 * sections du site, ce qu'une adresse postale n'est pas. Les téléphones, eux,
 * gardent la leur - on les cherche, on ne les lit pas.
 *
 * Les réseaux sociaux ferment la barre du bas, à l'opposé du copyright.
 */
export function PiedDePage() {
  const t = useTranslations('pied');
  const tNav = useTranslations('nav');
  const annee = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-ablode-nuit text-white">
      <div className="conteneur py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.9fr_1fr_1fr_1fr]">
          <div className="sm:col-span-2 lg:col-span-1">
            {/*
              Logo en couleurs, et non une silhouette blanche : c'est la
              marque de l'association, le bleu et le vert en font partie.
            */}
            <Logo taille={38} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              {t('association')}
            </p>

            <div className="mt-6">
              <p className="etiquette mb-3 !text-white/45">{t('adresseTitre')}</p>
              <address className="space-y-1 text-sm not-italic leading-relaxed text-white/70">
                <p>{ASSOCIATION.adresse}</p>
                <p>
                  {ASSOCIATION.ville}, {ASSOCIATION.pays}
                </p>
              </address>
            </div>
          </div>

          <div>
            <p className="etiquette mb-4 !text-white/45">{t('contactTitre')}</p>
            <ul className="space-y-1.5 text-sm">
              {ASSOCIATION.telephones.map((numero) => (
                <li key={numero}>
                  <a
                    href={lienTelephone(numero)}
                    className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair"
                  >
                    {numero}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label={t('navigation')}>
            <p className="etiquette mb-4 !text-white/45">{t('navigation')}</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/carte" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('carte')}
                </Link>
              </li>
              <li>
                <Link href="/resultats" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('resultats')}
                </Link>
              </li>
              <li>
                <Link href="/actualites" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('actualites')}
                </Link>
              </li>
              <li>
                <Link href="/a-propos" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('aPropos')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t('association2')}>
            <p className="etiquette mb-4 !text-white/45">{t('association2')}</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/contact" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {tNav('contact')}
                </Link>
              </li>
              <li>
                <Link href="/benevole" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  Devenir bénévole
                </Link>
              </li>
              <li>
                <Link href="/mentions-legales" className="inline-block py-1 text-white/80 transition-colors hover:text-ablode-vert-clair">
                  {t('mentions')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-white/40">
            © {annee} ABLODE - {t('droits')}
          </p>
          <div className="flex items-center gap-3">
            <p className="etiquette !text-white/45">{t('suivre')}</p>
            <ReseauxSociaux taille={18} variante="sombre" />
          </div>
        </div>
      </div>
    </footer>
  );
}
