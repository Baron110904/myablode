'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { connexion, deconnexion, restaurerSession } from '@/lib/api';
import type { Role, Utilisateur } from '@/lib/types';

interface ValeurContexte {
  utilisateur: Utilisateur | null;
  chargement: boolean;
  /** Renvoie le profil connecté : l'appelant en déduit sa page d'accueil. */
  seConnecter: (
    email: string,
    motDePasse: string,
    code2fa?: string,
  ) => Promise<Utilisateur>;
  seDeconnecter: () => Promise<void>;
  /** Vrai si le rôle courant figure parmi ceux attendus. */
  peut: (...roles: Role[]) => boolean;
  rafraichirProfil: () => Promise<void>;
}

const ContexteAuth = createContext<ValeurContexte | null>(null);

/**
 * Session du back-office.
 *
 * Le jeton d'accès vit en mémoire (jamais en localStorage : il serait lisible
 * par n'importe quel script injecté). Sa persistance repose sur le cookie de
 * refresh HttpOnly, rejoué au montage.
 */
export function FournisseurAuth({ children }: { children: React.ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);
  const [chargement, setChargement] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let annule = false;

    void (async () => {
      const profil = await restaurerSession();
      if (!annule) {
        setUtilisateur(profil);
        setChargement(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, []);

  const seConnecter = useCallback(
    async (email: string, motDePasse: string, code2fa?: string) => {
      const { user } = await connexion(email, motDePasse, code2fa);
      setUtilisateur(user);
      return user;
    },
    [],
  );

  const seDeconnecter = useCallback(async () => {
    await deconnexion();
    setUtilisateur(null);
    router.replace('/admin/login');
  }, [router]);

  const rafraichirProfil = useCallback(async () => {
    setUtilisateur(await restaurerSession());
  }, []);

  const peut = useCallback(
    (...roles: Role[]) => Boolean(utilisateur && roles.includes(utilisateur.role)),
    [utilisateur],
  );

  const valeur = useMemo(
    () => ({ utilisateur, chargement, seConnecter, seDeconnecter, peut, rafraichirProfil }),
    [utilisateur, chargement, seConnecter, seDeconnecter, peut, rafraichirProfil],
  );

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>;
}

export function useAuth(): ValeurContexte {
  const contexte = useContext(ContexteAuth);
  if (!contexte) {
    throw new Error('useAuth doit être utilisé dans un FournisseurAuth.');
  }
  return contexte;
}
