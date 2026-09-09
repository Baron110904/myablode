'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte, Chargement, Panneau } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure, depuis, nombre } from '@/lib/format';
import type { KoboConfig, KoboSyncLog, ResultatSync, ResultatTestKobo } from '@/lib/types';

/** Champs de la base qu'un champ Kobo peut alimenter. */
const CHAMPS_CIBLES = [
  '', 'code_unique', 'nom', 'prenom', 'date_naissance', 'sexe', 'telephone',
  'commune_id', 'date_depistage', 'type', 'glycemie', 'imc', 'resultat',
  'oriente_centre', 'notes',
];

/**
 * Configuration de l'intégration KoboToolbox (section 3.2.3.A).
 *
 * Le parcours suit l'ordre d'usage réel : renseigner le jeton → tester la
 * connexion → choisir le formulaire → associer les champs → synchroniser.
 */
export function OngletKobo() {
  const [config, setConfig] = useState<KoboConfig | null>(null);
  const [logs, setLogs] = useState<KoboSyncLog[]>([]);
  const [chargement, setChargement] = useState(true);

  const [apiUrl, setApiUrl] = useState('');
  const [jeton, setJeton] = useState('');
  const [formId, setFormId] = useState('');
  const [intervalle, setIntervalle] = useState(30);
  const [autoSync, setAutoSync] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const [test, setTest] = useState<ResultatTestKobo | null>(null);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState<'test' | 'enregistrement' | 'sync' | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [configuration, journal] = await Promise.all([
        apiAdmin<KoboConfig>('/kobo/config'),
        apiAdmin<KoboSyncLog[]>('/kobo/logs', { params: { limite: 10 } }),
      ]);
      setConfig(configuration);
      setLogs(journal);
      setApiUrl(configuration.api_url);
      setFormId(configuration.form_id ?? '');
      setIntervalle(configuration.sync_interval);
      setAutoSync(configuration.auto_sync_enabled);
      setMapping(configuration.field_mapping ?? {});
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Chargement impossible.',
      );
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function tester() {
    setOccupe('test');
    setErreur('');
    setTest(null);
    try {
      const resultat = await apiAdmin<ResultatTestKobo>('/kobo/test', {
        method: 'POST',
        body: {
          api_url: apiUrl,
          api_token: jeton || undefined,
          form_id: formId || undefined,
        },
      });
      setTest(resultat);

      // Adopter la correspondance déduite par le serveur : sans cela, les
      // listes s'affichent sur « Ignorer » alors que la synchronisation
      // reconnaît bel et bien les champs.
      if (resultat.mappingSuggere) {
        setMapping((courant) => ({ ...resultat.mappingSuggere, ...courant }));
      }
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Test impossible.',
      );
    } finally {
      setOccupe(null);
    }
  }

  async function enregistrer() {
    setOccupe('enregistrement');
    setErreur('');
    setMessage('');
    try {
      await apiAdmin('/kobo/config', {
        method: 'PUT',
        body: {
          api_url: apiUrl,
          // Un champ jeton vide signifie « conserver l'actuel ».
          api_token: jeton || undefined,
          form_id: formId || undefined,
          sync_interval: intervalle,
          auto_sync_enabled: autoSync,
          field_mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
        },
      });
      setJeton('');
      setMessage('Configuration Kobo enregistrée.');
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setOccupe(null);
    }
  }

  async function synchroniser(complet: boolean) {
    setOccupe('sync');
    setErreur('');
    setMessage('');
    try {
      const resultat = await apiAdmin<ResultatSync>('/kobo/sync', {
        method: 'POST',
        body: { complet },
      });
      setMessage(resultat.message);
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Synchronisation impossible.',
      );
    } finally {
      setOccupe(null);
    }
  }

  if (chargement) return <Chargement />;

  return (
    <div className="space-y-5">
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

      <Panneau titre="Connexion à KoboToolbox">
        <div className="space-y-5">
          <div>
            <label htmlFor="api_url" className="etiquette mb-2 block">
              URL de l’API
            </label>
            <input
              id="api_url"
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              className="admin-champ font-mono text-[0.8125rem]"
              placeholder="https://kf.kobotoolbox.org"
            />
            <p className="mt-1.5 text-[0.75rem] text-admin-gris">
              Serveur public : <code>https://kf.kobotoolbox.org</code> · Serveur OCHA :{' '}
              <code>https://kobo.humanitarianresponse.info</code>
            </p>
          </div>

          <div>
            <label htmlFor="jeton" className="etiquette mb-2 block">
              Jeton API
            </label>
            <input
              id="jeton"
              type="password"
              value={jeton}
              onChange={(e) => setJeton(e.target.value)}
              autoComplete="off"
              className="admin-champ font-mono text-[0.8125rem]"
              placeholder={
                config?.token_configure
                  ? '•••••••••• (jeton enregistré — laisser vide pour le conserver)'
                  : 'Collez votre jeton API Kobo'
              }
            />
            <p className="mt-1.5 text-[0.75rem] leading-relaxed text-admin-gris">
              Dans KoboToolbox : <strong>Compte → Paramètres du compte → Jeton API</strong>.
              Le jeton n’est jamais réaffiché après enregistrement, ni consigné dans le
              journal d’audit.
            </p>
          </div>

          <div>
            <label htmlFor="form_id" className="etiquette mb-2 block">
              Identifiant du formulaire (UID)
            </label>
            <input
              id="form_id"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className="admin-champ font-mono text-[0.8125rem]"
              placeholder="aBcDeFgH12345…"
            />
            <p className="mt-1.5 text-[0.75rem] text-admin-gris">
              Visible dans l’URL du projet Kobo, ou sélectionnable ci-dessous après un
              test de connexion réussi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void tester()}
              disabled={occupe !== null}
              className="admin-bouton-clair"
            >
              {occupe === 'test' ? 'Test en cours…' : 'Tester la connexion'}
            </button>
            <button
              type="button"
              onClick={() => void enregistrer()}
              disabled={occupe !== null}
              className="admin-bouton"
            >
              {occupe === 'enregistrement' ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>

          {test && (
            <div className="space-y-4">
              <Alerte type={test.ok ? 'succes' : 'erreur'}>{test.message}</Alerte>

              {test.formulairesDisponibles && test.formulairesDisponibles.length > 0 && (
                <div>
                  <h3 className="etiquette mb-2">Formulaires accessibles</h3>
                  <ul className="divide-y divide-admin-trait border border-admin-trait">
                    {test.formulairesDisponibles.map((formulaire) => (
                      <li
                        key={formulaire.uid}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{formulaire.nom}</p>
                          <p className="font-mono text-[0.75rem] text-admin-gris">
                            {formulaire.uid} · {nombre(formulaire.soumissions)} soumissions
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormId(formulaire.uid)}
                          className={
                            formId === formulaire.uid
                              ? 'admin-bouton'
                              : 'admin-bouton-clair'
                          }
                        >
                          {formId === formulaire.uid ? '✓ Sélectionné' : 'Choisir'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {test.champs && test.champs.length > 0 && (
                <div>
                  <h3 className="etiquette mb-2">
                    Champs du formulaire → colonnes de la base
                  </h3>
                  <p className="mb-3 text-[0.75rem] leading-relaxed text-admin-gris">
                    Détectés depuis une soumission réelle et associés
                    automatiquement quand le nom le permet. Vérifiez les
                    correspondances, corrigez-les au besoin, puis enregistrez.
                  </p>
                  <ul className="space-y-2">
                    {test.champs.map((champ) => (
                      <li
                        key={champ}
                        className="grid grid-cols-[1fr_28px_1fr] items-center gap-3"
                      >
                        <span className="truncate bg-admin-fond px-3 py-2.5 font-mono text-[0.8125rem]">
                          {champ}
                        </span>
                        <span aria-hidden className="text-center text-admin-gris">
                          →
                        </span>
                        <select
                          value={mapping[champ] ?? ''}
                          onChange={(e) =>
                            setMapping((courant) => ({
                              ...courant,
                              [champ]: e.target.value,
                            }))
                          }
                          aria-label={`Colonne cible pour ${champ}`}
                          className="admin-champ font-mono text-[0.8125rem]"
                        >
                          {CHAMPS_CIBLES.map((cible) => (
                            <option key={cible} value={cible}>
                              {cible || '— Ignorer'}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Panneau>

      <Panneau titre="Synchronisation">
        <div className="space-y-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-admin-encre"
            />
            <span className="text-sm">
              <span className="font-bold">Synchronisation automatique</span>
              <span className="mt-0.5 block text-[0.8125rem] text-admin-gris">
                Récupère périodiquement les nouvelles soumissions, sans intervention.
              </span>
            </span>
          </label>

          <div className="max-w-xs">
            <label htmlFor="intervalle" className="etiquette mb-2 block">
              Intervalle (minutes)
            </label>
            <input
              id="intervalle"
              type="number"
              min={5}
              max={1440}
              value={intervalle}
              onChange={(e) => setIntervalle(Number(e.target.value))}
              className="admin-champ"
            />
            <p className="mt-1.5 text-[0.75rem] text-admin-gris">
              Entre 5 minutes et 24 heures.
            </p>
          </div>

          {config && (
            <div className="border border-admin-trait bg-admin-fond p-4">
              <p className="etiquette mb-2">Dernière synchronisation</p>
              {config.last_sync_at ? (
                <p className="text-sm">
                  {dateHeure(config.last_sync_at)}{' '}
                  <span className="text-admin-gris">({depuis(config.last_sync_at)})</span>
                  {' · '}
                  <span
                    className={
                      config.last_sync_status === 'erreur'
                        ? 'text-ablode-alerte'
                        : 'text-admin-vert'
                    }
                  >
                    {config.last_sync_status === 'erreur' ? 'échec' : 'succès'}
                  </span>
                  {' · '}
                  {nombre(config.last_sync_count)} enregistrements
                </p>
              ) : (
                <p className="text-sm text-admin-gris">Jamais synchronisé.</p>
              )}
              {config.last_sync_message && (
                <p className="mt-2 font-mono text-[0.75rem] leading-relaxed text-admin-gris">
                  {config.last_sync_message}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void synchroniser(false)}
              disabled={occupe !== null || !config?.token_configure || !config?.form_id}
              className="admin-bouton"
            >
              {occupe === 'sync' ? 'Synchronisation…' : 'Sync maintenant'}
            </button>
            <button
              type="button"
              onClick={() => void synchroniser(true)}
              disabled={occupe !== null || !config?.token_configure || !config?.form_id}
              className="admin-bouton-clair"
            >
              Resynchroniser tout
            </button>
          </div>

          {(!config?.token_configure || !config?.form_id) && (
            <Alerte type="attention">
              Renseignez le jeton API et l’identifiant du formulaire, puis enregistrez,
              avant de lancer une synchronisation.
            </Alerte>
          )}
        </div>
      </Panneau>

      <Panneau titre="Journal des synchronisations">
        {logs.length === 0 ? (
          <p className="text-sm text-admin-gris">Aucune synchronisation enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-admin-trait">
                  <th className="admin-th">Date</th>
                  <th className="admin-th">Déclencheur</th>
                  <th className="admin-th">Reçus</th>
                  <th className="admin-th">Importés</th>
                  <th className="admin-th">Doublons</th>
                  <th className="admin-th">Erreurs</th>
                  <th className="admin-th">Durée</th>
                  <th className="admin-th">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-trait">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="admin-td whitespace-nowrap font-mono text-[0.8125rem]">
                      {dateHeure(log.created_at)}
                    </td>
                    <td className="admin-td">
                      {log.declencheur === 'cron' ? 'Automatique' : 'Manuelle'}
                    </td>
                    <td className="admin-td font-mono text-[0.8125rem]">
                      {nombre(log.nb_recus)}
                    </td>
                    <td className="admin-td font-mono text-[0.8125rem]">
                      {nombre(log.nb_importes)}
                    </td>
                    <td className="admin-td font-mono text-[0.8125rem]">
                      {nombre(log.nb_doublons)}
                    </td>
                    <td className="admin-td font-mono text-[0.8125rem]">
                      {nombre(log.nb_erreurs)}
                    </td>
                    <td className="admin-td font-mono text-[0.8125rem]">
                      {log.duree_ms ? `${(log.duree_ms / 1000).toFixed(1)} s` : '—'}
                    </td>
                    <td className="admin-td">
                      <span
                        className={`pastille ${
                          log.statut === 'succes' ? 'pastille-normal' : 'pastille-alerte'
                        }`}
                      >
                        {log.statut === 'succes' ? 'Succès' : 'Erreur'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panneau>
    </div>
  );
}
