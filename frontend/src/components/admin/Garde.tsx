'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { pageAccueilRole } from '@/lib/format';
import { useAuth } from './ContexteAuth';
import type { Role } from '@/lib/types';

/**
 * Garde côté navigateur.
 *
 * Elle sert le confort de navigation, pas la sécurité : c'est l'API qui
 * refuse les requêtes non autorisées. Sans cette garde, un rôle Viewer
 * verrait une page se dessiner puis se remplir d'erreurs 403.
 */
export function Garde({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { utilisateur, chargement } = useAuth();
  const router = useRouter();
  const chemin = usePathname();

  useEffect(() => {
    if (chargement) return;

    if (!utilisateur) {
      router.replace(`/admin/login?retour=${encodeURIComponent(chemin)}`);
      return;
    }
    if (roles && !roles.includes(utilisateur.role)) {
      router.replace(pageAccueilRole(utilisateur.role));
    }
  }, [chargement, utilisateur, roles, router, chemin]);

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="animate-pulsation font-mono text-etiquette uppercase text-admin-gris">
          Vérification de la session…
        </span>
      </div>
    );
  }

  if (!utilisateur || (roles && !roles.includes(utilisateur.role))) {
    return null;
  }

  return <>{children}</>;
}
