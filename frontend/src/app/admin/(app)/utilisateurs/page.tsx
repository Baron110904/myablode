'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alerte,
  Chargement,
  ConfirmationSuppression,
  EnTetePage,
  EtatVide,
  Modale,
  Pagination,
} from '@/components/admin/Elements';
import { Garde } from '@/components/admin/Garde';
import { useAuth } from '@/components/admin/ContexteAuth';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, LIBELLES_ROLE, nombre } from '@/lib/format';
import type { Paginated, Role, Utilisateur } from '@/lib/types';

const VIDE: Paginated<Utilisateur> = { items: [], total: 0, page: 1, limit: 20, pages: 1 };

const DESCRIPTIONS_ROLE: Record<Role, string> = {
  super_admin: 'Accès total : configuration Kobo, utilisateurs, paramètres système.',
  admin: 'Import, campagnes, articles — sans configuration Kobo ni gestion des comptes.',
  viewer: 'Lecture seule des statistiques et des données, exports anonymisés.',
};

export default function PageUtilisateurs() {
  return (
    <Garde roles={['super_admin']}>
      <ContenuUtilisateurs />
    </Garde>
  );
}

function ContenuUtilisateurs() {
  const { utilisateur: moi } = useAuth();

  const [donnees, setDonnees] = useState<Paginated<Utilisateur>>(VIDE);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [rechercheActive, setRechercheActive] = useState('');

  const [enEdition, setEnEdition] = useState<Utilisateur | null | 'nouveau'>(null);
  const [aSupprimer, setASupprimer] = useState<Utilisateur | null>(null);
  const [motDePasseTemporaire, setMotDePasseTemporaire] = useState<{
    email: string;
    valeur: string;
  } | null>(null);
  const [action, setAction] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      setDonnees(
        await apiAdmin<Paginated<Utilisateur>>('/users', {
          params: { page, limit: 20, recherche: rechercheActive || undefined },
        }),
      );
      setErreur('');
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, [page, rechercheActive]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function supprimer() {
    if (!aSupprimer) return;
    setAction(true);
    try {
      await apiAdmin(`/users/${aSupprimer.id}`, { method: 'DELETE' });
      setMessage(`Compte ${aSupprimer.email} supprimé.`);
      setASupprimer(null);
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Suppression impossible.',
      );
      setASupprimer(null);
    } finally {
      setAction(false);
    }
  }

  async function reinitialiser(utilisateur: Utilisateur) {
    try {
      const reponse = await apiAdmin<{ motDePasseTemporaire: string }>(
        `/users/${utilisateur.id}/reinitialiser-mot-de-passe`,
        { method: 'POST' },
      );
      setMotDePasseTemporaire({
        email: utilisateur.email,
        valeur: reponse.motDePasseTemporaire,
      });
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError
          ? erreurAttrapee.message
          : 'Réinitialisation impossible.',
      );
    }
  }

  async function basculerActivation(utilisateur: Utilisateur) {
    try {
      await apiAdmin(`/users/${utilisateur.id}`, {
        method: 'PATCH',
        body: { active: !utilisateur.active },
      });
      setMessage(
        `Compte ${utilisateur.email} ${utilisateur.active ? 'désactivé' : 'réactivé'}.`,
      );
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Action impossible.',
      );
    }
  }

  return (
    <>
      <EnTetePage
        titre="Utilisateurs"
        complement={`${nombre(donnees.total)} comptes`}
        actions={
          <button
            type="button"
            onClick={() => setEnEdition('nouveau')}
            className="admin-bouton"
          >
            + Nouveau compte
          </button>
        }
      />

      <div className="space-y-4 p-6">
        {erreur && (
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        )}
        {message && (
          <Alerte type="succes" onFermer={() => setMessage('')}>
            {message}
          </Alerte>
        )}

        <div className="grid gap-px bg-admin-trait sm:grid-cols-3">
          {(Object.keys(DESCRIPTIONS_ROLE) as Role[]).map((role) => (
            <div key={role} className="bg-white px-5 py-4">
              <p className="etiquette">{LIBELLES_ROLE[role]}</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-admin-gris">
                {DESCRIPTIONS_ROLE[role]}
              </p>
            </div>
          ))}
        </div>

        <div className="admin-panneau">
          <form
            onSubmit={(evenement) => {
              evenement.preventDefault();
              setPage(1);
              setRechercheActive(recherche.trim());
            }}
            className="flex gap-2 border-b border-admin-trait p-4"
            role="search"
          >
            <label htmlFor="recherche-users" className="sr-only">
              Rechercher un compte
            </label>
            <input
              id="recherche-users"
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un nom ou une adresse email…"
              className="admin-champ"
            />
            <button type="submit" className="admin-bouton-clair shrink-0">
              OK
            </button>
          </form>

          {chargement ? (
            <Chargement />
          ) : donnees.items.length === 0 ? (
            <EtatVide message="Aucun compte trouvé." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-admin-trait">
                    <th className="admin-th">Nom</th>
                    <th className="admin-th">Email</th>
                    <th className="admin-th">Rôle</th>
                    <th className="admin-th">2FA</th>
                    <th className="admin-th">Dernière connexion</th>
                    <th className="admin-th">Statut</th>
                    <th className="admin-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-trait">
                  {donnees.items.map((utilisateur) => {
                    const cestMoi = utilisateur.id === moi?.id;
                    return (
                      <tr key={utilisateur.id} className="transition-colors duration-150 hover:bg-admin-fond">
                        <td className="admin-td font-bold">
                          {utilisateur.prenom} {utilisateur.nom}
                          {cestMoi && (
                            <span className="ml-2 font-mono text-[0.6875rem] uppercase text-admin-gris">
                              vous
                            </span>
                          )}
                        </td>
                        <td className="admin-td font-mono text-[0.8125rem]">
                          {utilisateur.email}
                        </td>
                        <td className="admin-td">
                          <span className="pastille pastille-neutre">
                            {LIBELLES_ROLE[utilisateur.role]}
                          </span>
                        </td>
                        <td className="admin-td font-mono text-[0.8125rem]">
                          {utilisateur.twofa_enabled ? '✓' : '—'}
                        </td>
                        <td className="admin-td font-mono text-[0.8125rem]">
                          {utilisateur.last_login ? dateHeure(utilisateur.last_login) : '—'}
                        </td>
                        <td className="admin-td">
                          <span
                            className={`pastille ${
                              utilisateur.active ? 'pastille-normal' : 'pastille-alerte'
                            }`}
                          >
                            {utilisateur.active ? 'Actif' : 'Désactivé'}
                          </span>
                        </td>
                        <td className="admin-td text-right">
                          <span className="flex flex-wrap justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setEnEdition(utilisateur)}
                              className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => void reinitialiser(utilisateur)}
                              className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                            >
                              Réinitialiser
                            </button>
                            {!cestMoi && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void basculerActivation(utilisateur)}
                                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-admin-encre"
                                >
                                  {utilisateur.active ? 'Désactiver' : 'Réactiver'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setASupprimer(utilisateur)}
                                  className="text-[0.8125rem] font-medium text-admin-gris hover:text-ablode-alerte"
                                >
                                  Supprimer
                                </button>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={donnees.page}
            pages={donnees.pages}
            total={donnees.total}
            limite={donnees.limit}
            onPage={setPage}
          />
        </div>
      </div>

      {enEdition && (
        <ModaleUtilisateur
          utilisateur={enEdition === 'nouveau' ? null : enEdition}
          onFermer={() => setEnEdition(null)}
          onEnregistre={(texte, motDePasse, email) => {
            setMessage(texte);
            setEnEdition(null);
            if (motDePasse && email) setMotDePasseTemporaire({ email, valeur: motDePasse });
            void charger();
          }}
        />
      )}

      {motDePasseTemporaire && (
        <Modale
          titre="Mot de passe temporaire"
          sousTitre={motDePasseTemporaire.email}
          onFermer={() => setMotDePasseTemporaire(null)}
        >
          <Alerte type="attention">
            Ce mot de passe ne sera plus affiché. Transmettez-le à la personne concernée
            par un canal sûr, et demandez-lui de le changer à sa première connexion.
          </Alerte>
          <p className="mt-5 select-all border border-admin-trait bg-admin-fond px-5 py-4 text-center font-mono text-xl tracking-[0.15em]">
            {motDePasseTemporaire.valeur}
          </p>
          <div className="mt-7 flex justify-end">
            <button
              type="button"
              onClick={() => setMotDePasseTemporaire(null)}
              className="admin-bouton"
            >
              J’ai noté ce mot de passe
            </button>
          </div>
        </Modale>
      )}

      {aSupprimer && (
        <ConfirmationSuppression
          titre="Supprimer ce compte ?"
          message={`Le compte ${aSupprimer.email} sera définitivement supprimé. Les actions qu'il a réalisées restent visibles dans le journal d'audit.`}
          onConfirmer={() => void supprimer()}
          onAnnuler={() => setASupprimer(null)}
          enCours={action}
        />
      )}
    </>
  );
}

function ModaleUtilisateur({
  utilisateur,
  onFermer,
  onEnregistre,
}: {
  utilisateur: Utilisateur | null;
  onFermer: () => void;
  onEnregistre: (message: string, motDePasse?: string, email?: string) => void;
}) {
  const edition = Boolean(utilisateur);
  const [valeurs, setValeurs] = useState({
    email: utilisateur?.email ?? '',
    prenom: utilisateur?.prenom ?? '',
    nom: utilisateur?.nom ?? '',
    role: (utilisateur?.role ?? 'viewer') as Role,
    password: '',
  });
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur('');
    setErreurs([]);

    try {
      if (edition && utilisateur) {
        await apiAdmin(`/users/${utilisateur.id}`, {
          method: 'PATCH',
          body: {
            email: valeurs.email,
            prenom: valeurs.prenom,
            nom: valeurs.nom,
            role: valeurs.role,
          },
        });
        onEnregistre(`Compte ${valeurs.email} mis à jour.`);
      } else {
        const reponse = await apiAdmin<{ motDePasseTemporaire?: string }>('/users', {
          method: 'POST',
          body: {
            email: valeurs.email,
            prenom: valeurs.prenom,
            nom: valeurs.nom,
            role: valeurs.role,
            password: valeurs.password || undefined,
          },
        });
        onEnregistre(
          `Compte ${valeurs.email} créé.`,
          reponse.motDePasseTemporaire,
          valeurs.email,
        );
      }
    } catch (erreurAttrapee) {
      if (erreurAttrapee instanceof ApiError) {
        setErreur(erreurAttrapee.message);
        setErreurs(erreurAttrapee.erreurs ?? []);
      } else {
        setErreur('Enregistrement impossible.');
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale
      titre={edition ? 'Modifier le compte' : 'Nouveau compte'}
      onFermer={onFermer}
    >
      <form onSubmit={soumettre}>
        {erreur && (
          <div className="mb-5">
            <Alerte type="erreur">
              {erreur}
              {erreurs.length > 1 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {erreurs.map((ligne) => (
                    <li key={ligne}>{ligne}</li>
                  ))}
                </ul>
              )}
            </Alerte>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="prenom" className="etiquette mb-2 block">
              Prénom *
            </label>
            <input
              id="prenom"
              required
              value={valeurs.prenom}
              onChange={(e) => maj('prenom', e.target.value)}
              className="admin-champ"
            />
          </div>
          <div>
            <label htmlFor="nom" className="etiquette mb-2 block">
              Nom *
            </label>
            <input
              id="nom"
              required
              value={valeurs.nom}
              onChange={(e) => maj('nom', e.target.value)}
              className="admin-champ"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className="etiquette mb-2 block">
              Adresse email *
            </label>
            <input
              id="email"
              type="email"
              required
              value={valeurs.email}
              onChange={(e) => maj('email', e.target.value)}
              className="admin-champ"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="role" className="etiquette mb-2 block">
              Rôle *
            </label>
            <select
              id="role"
              value={valeurs.role}
              onChange={(e) => maj('role', e.target.value)}
              className="admin-champ"
            >
              <option value="viewer">Viewer — lecture seule</option>
              <option value="admin">Admin — données et contenus</option>
              <option value="super_admin">Super admin — accès total</option>
            </select>
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-admin-gris">
              {DESCRIPTIONS_ROLE[valeurs.role]}
            </p>
          </div>

          {!edition && (
            <div className="sm:col-span-2">
              <label htmlFor="password" className="etiquette mb-2 block">
                Mot de passe
              </label>
              <input
                id="password"
                type="text"
                value={valeurs.password}
                onChange={(e) => maj('password', e.target.value)}
                placeholder="Laisser vide pour en générer un automatiquement"
                className="admin-champ"
              />
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-admin-gris">
                8 caractères minimum, avec au moins une minuscule, une majuscule et un
                chiffre.
              </p>
            </div>
          )}
        </div>

        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="admin-bouton-clair">
            Annuler
          </button>
          <button type="submit" disabled={envoi} className="admin-bouton">
            {envoi ? '…' : edition ? 'Enregistrer' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </Modale>
  );
}
