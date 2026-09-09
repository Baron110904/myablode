'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte, Chargement, Panneau } from '@/components/admin/Elements';
import { ExplicationSeuils } from '@/components/admin/ExplicationSeuils';
import { apiAdmin, ApiError } from '@/lib/api';
import type { Setting } from '@/lib/types';

const DESCRIPTIONS: Record<string, { libelle: string; unite: string; aide: string }> = {
  seuil_glycemie_normale: {
    libelle: 'Glycémie — limite du normal',
    unite: 'mg/dL',
    aide: 'En dessous de cette valeur, le résultat est classé « Normal ».',
  },
  seuil_glycemie_diabete: {
    libelle: 'Glycémie — seuil du diabète',
    unite: 'mg/dL',
    aide: 'À partir de cette valeur, le résultat est classé « Diabète ». Entre les deux seuils : « Pré-diabète ».',
  },
  seuil_imc_surpoids: {
    libelle: 'IMC — seuil de surpoids',
    unite: '',
    aide: 'Valeur indicative affichée dans les fiches.',
  },
  seuil_imc_obesite: {
    libelle: 'IMC — seuil d’obésité',
    unite: '',
    aide: 'À partir de cette valeur, un dépistage de type obésité est classé « Obésité ».',
  },
  seuil_alerte_prevalence: {
    libelle: 'Alerte de prévalence',
    unite: '%',
    aide: 'Taux au-delà duquel une commune remonte dans les alertes du tableau de bord.',
  },
};

/** Seuils cliniques configurables (US-ADM-15, section 3.2.7). */
export function OngletSeuils() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const liste = await apiAdmin<Setting[]>('/settings/groupe/seuils');
      setSettings(liste);
      setValeurs(
        Object.fromEntries(liste.map((setting) => [setting.key, String(setting.value)])),
      );
      setErreur('');
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

  async function enregistrer() {
    setEnvoi(true);
    setErreur('');
    setMessage('');
    try {
      await apiAdmin('/settings', {
        method: 'PUT',
        body: Object.fromEntries(
          Object.entries(valeurs).map(([cle, valeur]) => [cle, Number(valeur)]),
        ),
      });
      setMessage(
        'Seuils enregistrés. Ils s’appliquent aux prochaines saisies et aux prochains imports ; ' +
          'les résultats déjà enregistrés ne sont pas recalculés.',
      );
      await charger();
    } catch (erreurAttrapee) {
      setErreur(
        erreurAttrapee instanceof ApiError ? erreurAttrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
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

      <Alerte type="attention">
        Ces seuils déterminent la classification clinique des dépistages. Ne les modifiez
        qu’en accord avec les recommandations médicales de référence.
      </Alerte>

      {/*
        L'explication précède les champs : on comprend ce qu'on règle avant de
        le régler. Les valeurs affichées sont celles réellement en vigueur.
      */}
      <Panneau titre="Comment le site classe les dépistages">
        <ExplicationSeuils
          seuils={{
            glycemieNormale: nombreOu(valeurs.seuil_glycemie_normale, 100),
            glycemieDiabete: nombreOu(valeurs.seuil_glycemie_diabete, 126),
            imcSurpoids: nombreOu(valeurs.seuil_imc_surpoids, 25),
            imcObesite: nombreOu(valeurs.seuil_imc_obesite, 30),
          }}
        />
      </Panneau>

      <Panneau titre="Seuils cliniques">
        <div className="max-w-2xl space-y-6">
          {settings.map((setting) => {
            const info = DESCRIPTIONS[setting.key];
            return (
              <div key={setting.key}>
                <label htmlFor={setting.key} className="etiquette mb-2 block">
                  {info?.libelle ?? setting.key}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id={setting.key}
                    type="number"
                    step="0.1"
                    value={valeurs[setting.key] ?? ''}
                    onChange={(e) =>
                      setValeurs((courant) => ({
                        ...courant,
                        [setting.key]: e.target.value,
                      }))
                    }
                    className="admin-champ max-w-[140px]"
                  />
                  {info?.unite && (
                    <span className="font-mono text-sm text-admin-gris">{info.unite}</span>
                  )}
                </div>
                <p className="mt-1.5 max-w-lg text-[0.75rem] leading-relaxed text-admin-gris">
                  {info?.aide ?? setting.description}
                </p>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => void enregistrer()}
            disabled={envoi}
            className="admin-bouton"
          >
            {envoi ? 'Enregistrement…' : 'Enregistrer les seuils'}
          </button>
        </div>
      </Panneau>
    </div>
  );
}

/** Valeur saisie, ou la valeur de référence si le champ est vide. */
function nombreOu(brut: string | undefined, defaut: number): number {
  const valeur = Number(brut);
  return Number.isFinite(valeur) && valeur > 0 ? valeur : defaut;
}
