'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CarteBenin } from '@/components/carte/CarteDynamique';
import { Alerte, Chargement, EnTetePage, Panneau } from '@/components/admin/Elements';
import { GraphiqueMensuel } from '@/components/admin/GraphiqueMensuel';
import { useAuth } from '@/components/admin/ContexteAuth';
import { apiAdmin, ApiError } from '@/lib/api';
import {
  date,
  depuis,
  LIBELLES_ACTION,
  LIBELLES_STATUT_CAMPAGNE,
  nombre,
  pourcentage,
  variation,
} from '@/lib/format';
import type { CarteGeoJson, KoboConfig, TableauDeBord } from '@/lib/types';

const CARTE_VIDE: CarteGeoJson = { type: 'FeatureCollection', features: [] };

/** Rafraîchissement automatique (section 3.2.2) : polling toutes les 30 s. */
const INTERVALLE_RAFRAICHISSEMENT = 30_000;

export default function PageTableauDeBord() {
  const { peut } = useAuth();
  const [donnees, setDonnees] = useState<TableauDeBord | null>(null);
  const [carte, setCarte] = useState<CarteGeoJson>(CARTE_VIDE);
  const [kobo, setKobo] = useState<KoboConfig | null>(null);
  const [erreur, setErreur] = useState('');
  const [syncEnCours, setSyncEnCours] = useState(false);
  const [messageSync, setMessageSync] = useState('');

  const charger = useCallback(async (silencieux = false) => {
    try {
      const [tableau, geojson] = await Promise.all([
        apiAdmin<TableauDeBord>('/stats/dashboard', { params: { periode: 'tout' } }),
        apiAdmin<CarteGeoJson>('/stats/carte', { params: { periode: 'tout' } }),
      ]);
      setDonnees(tableau);
      setCarte(geojson);
      setErreur('');
    } catch (erreurAttrapee) {
      // Un échec de rafraîchissement de fond ne doit pas effacer l'écran.
      if (!silencieux) {
        setErreur(
          erreurAttrapee instanceof ApiError
            ? erreurAttrapee.message
            : 'Chargement du tableau de bord impossible.',
        );
      }
    }
  }, []);

  const chargerKobo = useCallback(async () => {
    try {
      setKobo(await apiAdmin<KoboConfig>('/kobo/config'));
    } catch {
      // Le rôle Viewer n'a pas accès à la configuration Kobo : sans objet.
    }
  }, []);

  useEffect(() => {
    void charger();
    void chargerKobo();

    const minuteur = setInterval(() => void charger(true), INTERVALLE_RAFRAICHISSEMENT);
    return () => clearInterval(minuteur);
  }, [charger, chargerKobo]);

  async function synchroniser() {
    setSyncEnCours(true);
    setMessageSync('');
    try {
      const resultat = await apiAdmin<{ message: string }>('/kobo/sync', {
        method: 'POST',
        body: {},
      });
      setMessageSync(resultat.message);
      await Promise.all([charger(), chargerKobo()]);
    } catch (erreurAttrapee) {
      setMessageSync(
        erreurAttrapee instanceof ApiError
          ? erreurAttrapee.message
          : 'Synchronisation impossible.',
      );
    } finally {
      setSyncEnCours(false);
    }
  }

  const badgeKobo = kobo ? <BadgeKobo config={kobo} /> : null;

  return (
    <>
      <EnTetePage
        titre="Tableau de bord"
        badge={badgeKobo}
        actions={
          <>
            <Link href="/admin/depistages" className="admin-bouton-clair">
              Voir les données
            </Link>
            {peut('super_admin', 'admin') && (
              <button
                type="button"
                onClick={() => void synchroniser()}
                disabled={syncEnCours}
                className="admin-bouton"
              >
                {syncEnCours ? 'Synchronisation…' : 'Sync maintenant'}
              </button>
            )}
          </>
        }
      />

      <div className="space-y-5 p-6">
        {erreur && <Alerte type="erreur">{erreur}</Alerte>}
        {messageSync && (
          <Alerte type="info" onFermer={() => setMessageSync('')}>
            {messageSync}
          </Alerte>
        )}

        {!donnees ? (
          <Chargement message="Chargement du tableau de bord…" />
        ) : (
          <>
            <div className="grid gap-px bg-admin-trait sm:grid-cols-2 xl:grid-cols-4">
              <CarteKpi
                libelle="Dépistages réalisés"
                valeur={nombre(donnees.resume.totalDepistages)}
                detail={`${variation(donnees.resume.variationDepistages7j)} / semaine`}
              />
              <CarteKpi
                libelle="Cas détectés"
                valeur={nombre(donnees.resume.casDetectes)}
                detail={`${variation(donnees.resume.variationCas7j)} / semaine`}
              />
              <CarteKpi
                libelle="Communes couvertes"
                valeur={nombre(donnees.resume.communesCouvertes)}
                detail={`sur ${nombre(donnees.resume.totalCommunes)}`}
              />
              <CarteKpi
                libelle="Taux de prévalence"
                valeur={pourcentage(donnees.resume.tauxPrevalence)}
                detail={`${nombre(donnees.resume.orientesCentre)} orientés`}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.75fr_1fr]">
              <Panneau titre="Évolution mensuelle" action={<span className="font-mono text-[0.8125rem] text-admin-gris">12 derniers mois</span>}>
                <GraphiqueMensuel donnees={donnees.evolution} />
              </Panneau>

              <Panneau
                titre="Répartition géographique"
                action={
                  peut('super_admin', 'admin') ? (
                    <Link
                      href="/admin/carte"
                      className="font-mono text-etiquette uppercase text-admin-vert hover:underline"
                    >
                      Ouvrir
                    </Link>
                  ) : null
                }
              >
                <div className="h-[320px]">
                  <CarteBenin
                    donnees={carte}
                    interactive={false}
                    afficherAttribution={false}
                  />
                </div>
              </Panneau>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <Panneau
                titre={`Alertes · taux > ${pourcentage(11, 0)}`}
                className="min-w-0"
              >
                {donnees.alertes.length === 0 ? (
                  <p className="text-sm text-admin-gris">
                    Aucune commune au-dessus du seuil d’alerte.
                  </p>
                ) : (
                  <ul className="divide-y divide-admin-trait">
                    {donnees.alertes.slice(0, 6).map((commune) => (
                      <li
                        key={commune.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="min-w-0 truncate text-sm font-bold">
                          {commune.nom}
                        </span>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="pastille pastille-alerte">
                            {pourcentage(commune.taux)}
                          </span>
                          <span className="font-mono text-[0.8125rem] text-admin-gris">
                            {nombre(commune.depistages)} dép.
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>

              <Panneau titre="Activité récente" className="min-w-0">
                {donnees.activite.length === 0 ? (
                  <p className="text-sm text-admin-gris">Aucune action enregistrée.</p>
                ) : (
                  <ul className="space-y-3.5">
                    {donnees.activite.map((entree) => (
                      <li key={entree.id} className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 gap-2.5">
                          <span
                            aria-hidden
                            className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                              entree.action.includes('fail')
                                ? 'bg-ablode-alerte'
                                : 'bg-admin-vert'
                            }`}
                          />
                          <span className="min-w-0 text-sm leading-snug">
                            {LIBELLES_ACTION[entree.action] ?? entree.action}
                            {entree.user && (
                              <span className="text-admin-gris">
                                {' '}
                                — {entree.user.prenom} {entree.user.nom}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[0.75rem] text-admin-gris">
                          {depuis(entree.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>

              <Panneau titre="Prochaines campagnes" className="min-w-0">
                {donnees.prochaines.length === 0 ? (
                  <p className="text-sm text-admin-gris">Aucune campagne planifiée.</p>
                ) : (
                  <ul className="divide-y divide-admin-trait">
                    {donnees.prochaines.map((campagne) => (
                      <li key={campagne.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 text-sm font-bold leading-snug">
                            {campagne.nom}
                          </p>
                          <span
                            className={`pastille shrink-0 ${
                              campagne.statut === 'en_cours'
                                ? 'pastille-normal'
                                : 'pastille-neutre'
                            }`}
                          >
                            {LIBELLES_STATUT_CAMPAGNE[campagne.statut]}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-[0.75rem] text-admin-gris">
                          {date(campagne.date_debut)}
                          {campagne.responsable && ` · ${campagne.responsable}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panneau>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function CarteKpi({
  libelle,
  valeur,
  detail,
}: {
  libelle: string;
  valeur: string;
  detail: string;
}) {
  return (
    <div className="bg-white px-6 py-5">
      <p className="etiquette">{libelle}</p>
      <p className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
        <span className="text-[1.75rem] font-bold leading-none tracking-[-0.02em]">
          {valeur}
        </span>
        <span className="font-mono text-[0.75rem] text-admin-vert">{detail}</span>
      </p>
    </div>
  );
}

function BadgeKobo({ config }: { config: KoboConfig }) {
  if (!config.token_configure || !config.form_id) {
    return (
      <span className="inline-flex items-center gap-2 bg-ablode-ambre-voile px-3 py-1.5 font-mono text-[0.75rem] text-ablode-ambre">
        <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-ablode-ambre" />
        Kobo non configuré
      </span>
    );
  }

  const erreur = config.last_sync_status === 'erreur';

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 font-mono text-[0.75rem] ${
        erreur ? 'bg-ablode-alerte-voile text-ablode-alerte' : 'bg-admin-actif text-ablode-vert-sombre'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          erreur ? 'bg-ablode-alerte' : 'bg-admin-vert'
        }`}
      />
      {erreur
        ? 'Dernière synchronisation en échec'
        : config.last_sync_at
          ? `Kobo synchronisé ${depuis(config.last_sync_at)} · ${nombre(config.last_sync_count)} nouveaux`
          : 'Kobo configuré, jamais synchronisé'}
    </span>
  );
}
