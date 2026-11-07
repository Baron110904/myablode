'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

/*
 * « Carte » ne figure pas dans cette liste : le bouton vert de droite y mène
 * déjà, et deux entrées pour une même destination dans un bandeau de cinq
 * liens font hésiter. Le pied de page la conserve, lui, parmi les sections.
 */
const LIENS = [
  { href: '/', cle: 'accueil' as const },
  { href: '/resultats', cle: 'resultats' as const },
  { href: '/actualites', cle: 'actualites' as const },
  { href: '/a-propos', cle: 'aPropos' as const },
];

/**
 * En-tête sombre, commun à tout le site vitrine.
 *
 * La refonte le pose sur fond vert nuit plutôt que sur papier : sur les trois
 * maquettes, il prolonge le bandeau de tête au lieu de s'en détacher. Les
 * liens sont regroupés dans une pilule translucide, et le lien courant prend
 * un fond blanc — un souligné ne se verrait pas sur ce fond.
 */
export function EnTete() {
  const t = useTranslations('nav');
  const chemin = usePathname();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [defile, setDefile] = useState(false);

  // Referme le menu mobile quand la navigation aboutit.
  useEffect(() => {
    setMenuOuvert(false);
  }, [chemin]);

  // Le bandeau se densifie au défilement : repère visuel discret indiquant
  // que la page a bougé.
  useEffect(() => {
    const surDefilement = () => setDefile(window.scrollY > 8);
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);

  const estActif = (href: string) =>
    href === '/' ? chemin === '/' : chemin.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-40 bg-ablode-profond transition-shadow duration-300 ${
        defile ? 'shadow-[0_10px_30px_-20px_rgba(0,0,0,0.9)]' : ''
      }`}
    >
      {/*
        Bandeau plus haut, et logo nettement plus grand : la marque de
        l'association y était réduite à 40 px, moins haute que la pilule de
        navigation posée à côté. Le bandeau reste plus bas sur téléphone,
        où chaque pixel pris en tête est pris au contenu.
      */}
      <div className="conteneur flex h-[76px] items-center justify-between gap-6 sm:h-[86px] lg:h-[96px]">
        <Logo taille={68} className="h-[46px] w-auto sm:h-[56px] lg:h-[68px]" />

        <nav
          className="hidden items-center gap-1 rounded-full bg-white/[0.07] p-1.5 lg:flex"
          aria-label="Navigation principale"
        >
          {LIENS.map((lien) => {
            const actif = estActif(lien.href);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={actif ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors duration-200 ${
                  actif
                    ? 'bg-white text-ablode-encre'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t(lien.cle)}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/carte"
          className="hidden lg:inline-flex items-center justify-center rounded-full bg-ablode-vert px-5 py-2.5 text-[0.9375rem] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-ablode-vert-sombre hover:shadow-relief motion-reduce:hover:translate-y-0"
        >
          {t('explorer')}
        </Link>

        <button
          type="button"
          onClick={() => setMenuOuvert((ouvert) => !ouvert)}
          aria-expanded={menuOuvert}
          aria-controls="menu-mobile"
          /*
            `py-1.5` porte la cible à 33 px de haut. Sans lui, le bouton
            mesurait 21 px — sous le minimum de 24 px du critère WCAG 2.2
            « Target Size », et c'est la seule porte d'entrée vers la
            navigation sur téléphone.
          */
          className="-mr-2 flex items-center gap-2.5 px-2 py-1.5 text-[0.875rem] font-semibold text-white lg:hidden"
        >
          <span className="flex h-3 w-4 flex-col justify-between">
            <span
              aria-hidden
              className={`block h-px w-full bg-white transition-transform duration-300 ${
                menuOuvert ? 'translate-y-[5.5px] rotate-45' : ''
              }`}
            />
            <span
              aria-hidden
              className={`block h-px w-full bg-white transition-opacity duration-200 ${
                menuOuvert ? 'opacity-0' : ''
              }`}
            />
            <span
              aria-hidden
              className={`block h-px w-full bg-white transition-transform duration-300 ${
                menuOuvert ? '-translate-y-[5.5px] -rotate-45' : ''
              }`}
            />
          </span>
          {menuOuvert ? t('fermer') : t('menu')}
        </button>
      </div>

      {/* Tiroir mobile : hauteur animée plutôt qu'apparition brutale. */}
      <div
        id="menu-mobile"
        className={`overflow-hidden border-t border-white/10 bg-ablode-profond transition-[max-height,opacity] duration-300 lg:hidden ${
          menuOuvert ? 'max-h-96 opacity-100' : 'max-h-0 border-transparent opacity-0'
        }`}
      >
        <nav className="conteneur flex flex-col py-2" aria-label="Navigation mobile">
          {LIENS.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={`border-b border-white/10 py-4 text-[1rem] font-medium transition-colors last:border-0 ${
                estActif(lien.href) ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {t(lien.cle)}
            </Link>
          ))}
          <Link
            href="/carte"
            className="my-4 inline-flex items-center justify-center rounded-full bg-ablode-vert px-7 py-3.5 text-[0.9375rem] font-semibold text-white"
          >
            {t('explorer')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
