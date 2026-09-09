'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/public/Logo';
import { useAuth } from './ContexteAuth';
import type { Role } from '@/lib/types';

interface Entree {
  href: string;
  libelle: string;
  roles: Role[];
}

/*
 * Le rôle « viewer » est celui des agents de terrain : trois pages, en
 * lecture seule. Ses dépistages sont en outre filtrés côté serveur à son
 * propre périmètre — masquer une entrée de menu ne protégerait rien.
 */
const ENTREES: Entree[] = [
  { href: '/admin', libelle: 'Tableau de bord', roles: ['super_admin', 'admin'] },
  { href: '/admin/depistages', libelle: 'Dépistages', roles: ['super_admin', 'admin', 'viewer'] },
  { href: '/admin/campagnes', libelle: 'Campagnes', roles: ['super_admin', 'admin'] },
  { href: '/admin/carte', libelle: 'Carte admin', roles: ['super_admin', 'admin'] },
  { href: '/admin/direct', libelle: 'Suivi en direct', roles: ['super_admin', 'admin', 'viewer'] },
  { href: '/admin/agents', libelle: 'Agents', roles: ['super_admin', 'admin'] },
  { href: '/admin/actualites', libelle: 'Actualités', roles: ['super_admin', 'admin'] },
  { href: '/admin/newsletter', libelle: 'Newsletter', roles: ['super_admin', 'admin'] },
  { href: '/admin/messages', libelle: 'Messages', roles: ['super_admin', 'admin', 'viewer'] },
  { href: '/admin/utilisateurs', libelle: 'Utilisateurs', roles: ['super_admin'] },
  { href: '/admin/audit', libelle: 'Journal d’audit', roles: ['super_admin', 'admin'] },
  { href: '/admin/parametres', libelle: 'Paramètres', roles: ['super_admin', 'admin'] },
];

export function BarreLaterale({ onNavigation }: { onNavigation?: () => void }) {
  const chemin = usePathname();
  const { utilisateur, seDeconnecter } = useAuth();

  // La navigation n'affiche que ce que le rôle courant peut réellement ouvrir.
  const entreesVisibles = ENTREES.filter((entree) =>
    utilisateur ? entree.roles.includes(utilisateur.role) : false,
  );

  const estActif = (href: string) =>
    href === '/admin' ? chemin === '/admin' : chemin.startsWith(href);

  return (
    <div className="flex h-full flex-col bg-admin-nuit">
      <div className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/10 px-6">
        <Logo taille={30} href="/admin" />
        <span className="text-[1.0625rem] font-bold text-white">MyABLODE</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4" aria-label="Navigation du back-office">
        <ul className="space-y-1">
          {entreesVisibles.map((entree) => {
            const actif = estActif(entree.href);
            return (
              <li key={entree.href}>
                <Link
                  href={entree.href}
                  onClick={onNavigation}
                  aria-current={actif ? 'page' : undefined}
                  className={`admin-lien-nav ${actif ? 'admin-lien-nav-actif' : ''}`}
                >
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      actif ? 'bg-ablode-vert-clair' : 'bg-white/25'
                    }`}
                  />
                  {entree.libelle}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-6">
        <p className="text-sm font-bold leading-tight text-white">
          {utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}` : '—'}
        </p>
        {/*
          Contour clair sur fond sombre : le bouton clair standard disparaîtrait
          dans la barre latérale.
        */}
        <button
          type="button"
          onClick={() => void seDeconnecter()}
          className="mt-4 w-full rounded-full border border-white/20 px-5 py-2.5 text-[0.875rem] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
