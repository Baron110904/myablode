'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';

const LIENS = [
  { href: '/', cle: 'accueil' as const },
  { href: '/carte', cle: 'carte' as const },
  { href: '/resultats', cle: 'resultats' as const },
  { href: '/actualites', cle: 'actualites' as const },
  { href: '/a-propos', cle: 'aPropos' as const },
];

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
      className={`sticky top-0 z-40 border-b bg-ablode-papier/95 backdrop-blur transition-[border-color,box-shadow] duration-300 ${
        defile ? 'border-ablode-trait shadow-carte' : 'border-transparent'
      }`}
    >
      <div className="conteneur flex h-[72px] items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Logo taille={34} />

          <nav
            className="hidden items-center gap-7 lg:flex"
            aria-label="Navigation principale"
          >
            {LIENS.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={estActif(lien.href) ? 'page' : undefined}
                className={`group relative py-1 text-[0.9375rem] font-medium transition-colors ${
                  estActif(lien.href)
                    ? 'text-ablode-encre'
                    : 'text-ablode-gris hover:text-ablode-encre'
                }`}
              >
                {t(lien.cle)}
                {/* Souligné qui se déploie depuis la gauche au survol. */}
                <span
                  aria-hidden
                  className={`absolute -bottom-0.5 left-0 h-px bg-ablode-vert transition-all duration-300 ${
                    estActif(lien.href) ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/carte" className="hidden lg:inline-flex bouton-principal !px-5 !py-2.5">
          {t('explorer')}
        </Link>

        <button
          type="button"
          onClick={() => setMenuOuvert((ouvert) => !ouvert)}
          aria-expanded={menuOuvert}
          aria-controls="menu-mobile"
          className="flex items-center gap-2.5 text-[0.875rem] font-semibold text-ablode-encre lg:hidden"
        >
          <span className="flex h-3 w-4 flex-col justify-between">
            <span
              aria-hidden
              className={`block h-px w-full bg-ablode-encre transition-transform duration-300 ${
                menuOuvert ? 'translate-y-[5.5px] rotate-45' : ''
              }`}
            />
            <span
              aria-hidden
              className={`block h-px w-full bg-ablode-encre transition-opacity duration-200 ${
                menuOuvert ? 'opacity-0' : ''
              }`}
            />
            <span
              aria-hidden
              className={`block h-px w-full bg-ablode-encre transition-transform duration-300 ${
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
        className={`overflow-hidden border-t bg-ablode-papier transition-[max-height,opacity] duration-300 lg:hidden ${
          menuOuvert
            ? 'max-h-96 border-ablode-trait opacity-100'
            : 'max-h-0 border-transparent opacity-0'
        }`}
      >
        <nav className="conteneur flex flex-col py-2" aria-label="Navigation mobile">
          {LIENS.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className={`border-b border-ablode-trait/60 py-4 text-[1rem] font-medium transition-colors last:border-0 ${
                estActif(lien.href) ? 'text-ablode-encre' : 'text-ablode-gris'
              }`}
            >
              {t(lien.cle)}
            </Link>
          ))}
          <Link href="/carte" className="bouton-principal my-4">
            {t('explorer')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
