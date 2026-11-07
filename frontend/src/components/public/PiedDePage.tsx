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
              Le verrouillage officiel, nom compris, et non plus l'emblème
              suivi du même nom recomposé en HTML : la marque se lisait deux
              fois, dans deux typographies. La version à nom blanc est servie
              ici - sur ce vert nuit, le nom composé en noir disparaîtrait.

              L'emblème garde ses couleurs : le bleu et le vert font partie
              de la marque, une silhouette blanche ne serait plus le logo.

              Le nom reste dans le texte de remplacement de l'image : il
              n'est plus affiché deux fois, mais il reste lisible par un
              lecteur d'écran et par les moteurs.
            */}
            <Logo
              variante="complet-sombre"
              taille={148}
              className="h-[112px] w-auto sm:h-[132px] lg:h-[148px]"
            />

            <div className="mt-6">
              <p className="etiquette mb-3 !text-white/60">{t('adresseTitre')}</p>
              <address className="space-y-1 text-sm not-italic leading-relaxed text-white/70">
                <p>
                  {ASSOCIATION.ville}, {ASSOCIATION.pays}
                </p>
              </address>
            </div>
          </div>

          <div>
            <p className="etiquette mb-4 !text-white/60">{t('contactTitre')}</p>
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
            <p className="etiquette mb-4 !text-white/60">{t('navigation')}</p>
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
            <p className="etiquette mb-4 !text-white/60">{t('association2')}</p>
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
          <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-white/55">
            © {annee} ABLODE - {t('droits')}
          </p>
          <div className="flex items-center gap-3">
            <p className="etiquette !text-white/60">{t('suivre')}</p>
            <ReseauxSociaux taille={18} variante="sombre" />
          </div>
        </div>
      </div>
    </footer>
  );
}
