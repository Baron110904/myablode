'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/public/Logo';
import { useAuth } from '@/components/admin/ContexteAuth';
import { ApiError } from '@/lib/api';
import { pageAccueilRole } from '@/lib/format';

export function FormulaireConnexion() {
  const { seConnecter, utilisateur, chargement } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [demande2fa, setDemande2fa] = useState(false);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const retourDemande = searchParams.get('retour');

  /*
   * La destination dépend du rôle : un compte en lecture n'a pas accès au
   * tableau de bord, l'y envoyer produirait un aller-retour visible.
   */
  const destination = (role: string) =>
    retourDemande ?? pageAccueilRole(role);

  // Une session encore valide évite de redemander les identifiants.
  useEffect(() => {
    if (!chargement && utilisateur) router.replace(destination(utilisateur.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargement, utilisateur, router, retourDemande]);

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (envoi) return;

    setEnvoi(true);
    setErreur('');

    try {
      const connecte = await seConnecter(email, motDePasse, code2fa || undefined);
      router.replace(destination(connecte?.role ?? 'admin'));
    } catch (erreurAttrapee) {
      const message =
        erreurAttrapee instanceof ApiError
          ? erreurAttrapee.message
          : 'Connexion impossible. Vérifiez que le serveur est démarré.';

      // Le backend signale ainsi qu'un second facteur est attendu.
      if (message === 'CODE_2FA_REQUIS') {
        setDemande2fa(true);
        setErreur('Saisissez le code de votre application d’authentification.');
      } else {
        setErreur(message);
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <Logo taille={44} href={null} />

      <p className="mt-10 text-[0.9375rem] font-semibold text-admin-vert">
        Accès réservé aux agents
      </p>
      <h1 className="mt-3 text-[2rem] font-bold leading-tight tracking-[-0.02em]">
        Espace administration
      </h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-admin-gris">
        Les données de dépistage sont nominatives et protégées.
        <br />
        Chaque action est tracée dans le journal d’audit.
      </p>

      <form onSubmit={soumettre} className="mt-9 space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="etiquette-douce mb-2 block">
            Adresse email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="admin-champ py-3"
            placeholder="k.anagonou@ablode.bj"
          />
        </div>

        <div>
          <label htmlFor="motdepasse" className="etiquette-douce mb-2 block">
            Mot de passe
          </label>
          <input
            id="motdepasse"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="admin-champ py-3"
          />
        </div>

        {demande2fa && (
          <div className="animate-apparition">
            <label htmlFor="code2fa" className="etiquette-douce mb-2 block">
              Code de double authentification
            </label>
            <input
              id="code2fa"
              name="code2fa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code2fa}
              onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, ''))}
              className="admin-champ py-3 font-mono tracking-[0.3em]"
              placeholder="000000"
            />
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Link
            href="/admin/mot-de-passe-oublie"
            className="text-[0.8125rem] font-semibold text-admin-vert transition-colors hover:text-ablode-vert-sombre"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {erreur && (
          <p
            role="alert"
            className="rounded-carte border border-ablode-alerte/30 bg-ablode-alerte-voile px-4 py-3 text-sm text-ablode-alerte"
          >
            {erreur}
          </p>
        )}

        <button type="submit" disabled={envoi} className="admin-bouton w-full py-3.5">
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <Link
        href="/"
        className="group mt-8 inline-flex items-center gap-2 text-[0.875rem] font-medium text-admin-gris transition-colors hover:text-admin-encre"
      >
        <span aria-hidden className="transition-transform duration-200 group-hover:-translate-x-1">
          ←
        </span>
        Retour au site
      </Link>
    </div>
  );
}
