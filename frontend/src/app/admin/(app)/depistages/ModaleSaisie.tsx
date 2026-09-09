'use client';

import { useState } from 'react';
import { Alerte, Modale } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import type { Campagne, Commune, Depistage } from '@/lib/types';

/** Formulaire de saisie manuelle (section 3.2.3.C, US-ADM-07 et US-ADM-08). */
export function ModaleSaisie({
  depistage,
  communes,
  campagnes,
  onFermer,
  onEnregistre,
}: {
  depistage: Depistage | null;
  communes: Commune[];
  campagnes: Campagne[];
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  const edition = Boolean(depistage);

  const [valeurs, setValeurs] = useState({
    code_unique: depistage?.code_unique ?? '',
    nom: depistage?.nom ?? '',
    prenom: depistage?.prenom ?? '',
    date_naissance: depistage?.date_naissance ?? '',
    sexe: depistage?.sexe ?? '',
    telephone: depistage?.telephone ?? '',
    commune_id: depistage?.commune_id ? String(depistage.commune_id) : '',
    date_depistage: depistage?.date_depistage ?? new Date().toISOString().slice(0, 10),
    type: depistage?.type ?? 'diabete',
    glycemie: depistage?.glycemie ?? '',
    poids: depistage?.poids ?? '',
    taille: depistage?.taille ?? '',
    campagne_id: depistage?.campagne_id ? String(depistage.campagne_id) : '',
    oriente_centre: depistage?.oriente_centre ?? false,
    notes: depistage?.notes ?? '',
  });

  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ: keyof typeof valeurs, valeur: string | boolean) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  /*
   * IMC calculé en direct, à la même formule que le serveur. Il n'est pas
   * saisissable : afficher le résultat du calcul évite d'avoir à le vérifier
   * après enregistrement, et empêche une valeur qui contredirait les mesures.
   */
  const imcCalcule = (() => {
    const poids = Number(valeurs.poids);
    const taille = Number(valeurs.taille);
    if (!poids || !taille) return null;
    const metres = taille / 100;
    return Math.round((poids / (metres * metres)) * 100) / 100;
  })();

  // Le résultat est déduit côté serveur à partir des seuils configurés.
  const mesureRequise =
    valeurs.type === 'diabete'
      ? !valeurs.glycemie
      : valeurs.type === 'obesite'
        ? imcCalcule === null
        : false;

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (envoi) return;

    setEnvoi(true);
    setErreur('');
    setErreurs([]);

    const corps = {
      code_unique: valeurs.code_unique || undefined,
      nom: valeurs.nom,
      prenom: valeurs.prenom,
      date_naissance: valeurs.date_naissance,
      sexe: valeurs.sexe,
      telephone: valeurs.telephone || undefined,
      commune_id: Number(valeurs.commune_id),
      date_depistage: valeurs.date_depistage,
      type: valeurs.type,
      glycemie: valeurs.glycemie ? Number(valeurs.glycemie) : undefined,
      poids: valeurs.poids ? Number(valeurs.poids) : undefined,
      taille: valeurs.taille ? Number(valeurs.taille) : undefined,
      campagne_id: Number(valeurs.campagne_id),
      oriente_centre: valeurs.oriente_centre,
      notes: valeurs.notes || undefined,
    };

    try {
      if (edition && depistage) {
        await apiAdmin(`/depistages/${depistage.id}`, { method: 'PATCH', body: corps });
        onEnregistre(`Dépistage de ${valeurs.prenom} ${valeurs.nom} mis à jour.`);
      } else {
        await apiAdmin('/depistages', { method: 'POST', body: corps });
        onEnregistre(`Dépistage de ${valeurs.prenom} ${valeurs.nom} enregistré.`);
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
      titre={edition ? 'Modifier le dépistage' : 'Saisie manuelle d’un dépistage'}
      sousTitre={
        edition
          ? 'La modification est tracée dans le journal d’audit'
          : 'Le résultat est déduit automatiquement des seuils cliniques'
      }
      onFermer={onFermer}
      large
    >
      <form onSubmit={soumettre} noValidate>
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
          <Champ
            id="code_unique"
            libelle="Code du dépisté"
            valeur={valeurs.code_unique}
            onChange={(v) => maj('code_unique', v)}
          />
          <Champ
            id="telephone"
            libelle="Téléphone"
            type="tel"
            valeur={valeurs.telephone}
            onChange={(v) => maj('telephone', v)}
          />
          <Champ
            id="nom"
            libelle="Nom"
            obligatoire
            valeur={valeurs.nom}
            onChange={(v) => maj('nom', v)}
          />
          <Champ
            id="prenom"
            libelle="Prénom"
            obligatoire
            valeur={valeurs.prenom}
            onChange={(v) => maj('prenom', v)}
          />
          <Champ
            id="date_naissance"
            libelle="Date de naissance"
            type="date"
            obligatoire
            valeur={valeurs.date_naissance}
            onChange={(v) => maj('date_naissance', v)}
          />
          <Champ
            id="sexe"
            libelle="Sexe"
            obligatoire
            valeur={valeurs.sexe}
            onChange={(v) => maj('sexe', v)}
            options={[
              { valeur: 'M', libelle: 'Masculin' },
              { valeur: 'F', libelle: 'Féminin' },
            ]}
          />
          <Champ
            id="commune_id"
            libelle="Commune"
            obligatoire
            valeur={valeurs.commune_id}
            onChange={(v) => maj('commune_id', v)}
            options={communes.map((commune) => ({
              valeur: String(commune.id),
              libelle: commune.nom,
            }))}
          />
          <Champ
            id="date_depistage"
            libelle="Date du dépistage"
            type="date"
            obligatoire
            valeur={valeurs.date_depistage}
            onChange={(v) => maj('date_depistage', v)}
          />
          <Champ
            id="type"
            libelle="Type de dépistage"
            obligatoire
            valeur={valeurs.type}
            onChange={(v) => maj('type', v)}
            options={[
              { valeur: 'diabete', libelle: 'Diabète' },
              { valeur: 'obesite', libelle: 'Obésité' },
              { valeur: 'endocrinopathie', libelle: 'Endocrinopathie' },
            ]}
          />
          <Champ
            id="campagne_id"
            libelle="Campagne associée"
            obligatoire
            valeur={valeurs.campagne_id}
            onChange={(v) => maj('campagne_id', v)}
            options={campagnes.map((campagne) => ({
              valeur: String(campagne.id),
              libelle: campagne.nom,
            }))}
          />
          <Champ
            id="glycemie"
            libelle="Glycémie (mg/dL)"
            type="number"
            valeur={valeurs.glycemie}
            onChange={(v) => maj('glycemie', v)}
            aide={valeurs.type === 'diabete' ? 'Requis pour un dépistage du diabète' : undefined}
          />
          <Champ
            id="poids"
            libelle="Poids (kg)"
            type="number"
            valeur={valeurs.poids}
            onChange={(v) => maj('poids', v)}
            aide={valeurs.type === 'obesite' ? 'Requis pour un dépistage de l’obésité' : undefined}
          />
          <Champ
            id="taille"
            libelle="Taille (cm)"
            type="number"
            valeur={valeurs.taille}
            onChange={(v) => maj('taille', v)}
            aide={valeurs.type === 'obesite' ? 'Requise pour calculer l’IMC' : undefined}
          />
        </div>

        {/* L'IMC n'est pas saisi : il découle du poids et de la taille. */}
        <p className="mt-4 rounded-carte bg-admin-fond px-5 py-3.5 text-sm">
          <span className="etiquette">IMC calculé</span>
          <span className="ml-3 font-mono text-base font-bold tabular-nums">
            {imcCalcule !== null ? imcCalcule.toFixed(2) : '—'}
          </span>
          <span className="ml-3 text-[0.8125rem] text-admin-gris">
            {imcCalcule !== null
              ? 'poids ÷ taille², calculé par la plateforme'
              : 'renseignez le poids et la taille'}
          </span>
        </p>

        <div className="mt-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={valeurs.oriente_centre}
              onChange={(e) => maj('oriente_centre', e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-admin-encre"
            />
            <span className="text-sm">
              <span className="font-bold">Orienté vers un centre de santé</span>
              <span className="mt-0.5 block text-[0.8125rem] text-admin-gris">
                À cocher lorsque la personne a été dirigée vers une structure de soin
                pour une prise en charge.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5">
          <label htmlFor="notes" className="etiquette mb-2 block">
            Notes
          </label>
          <textarea
            id="notes"
            rows={3}
            value={valeurs.notes}
            onChange={(e) => maj('notes', e.target.value)}
            className="admin-champ-multiligne"
          />
        </div>

        {mesureRequise && (
          <div className="mt-5">
            <Alerte type="attention">
              Sans {valeurs.type === 'diabete' ? 'glycémie' : 'IMC'}, le résultat sera
              classé « Autre » faute de mesure exploitable.
            </Alerte>
          </div>
        )}

        <div className="mt-7 flex justify-end gap-2">
          <button type="button" onClick={onFermer} className="admin-bouton-clair">
            Annuler
          </button>
          <button type="submit" disabled={envoi} className="admin-bouton">
            {envoi ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Créer le dépistage'}
          </button>
        </div>
      </form>
    </Modale>
  );
}

function Champ({
  id,
  libelle,
  valeur,
  onChange,
  type = 'text',
  obligatoire = false,
  options,
  aide,
}: {
  id: string;
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  type?: string;
  obligatoire?: boolean;
  options?: Array<{ valeur: string; libelle: string }>;
  aide?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="etiquette mb-2 block">
        {libelle}
        {obligatoire && (
          <span aria-hidden className="ml-1 text-admin-vert">
            *
          </span>
        )}
      </label>

      {options ? (
        <select
          id={id}
          value={valeur}
          required={obligatoire}
          onChange={(e) => onChange(e.target.value)}
          className="admin-champ"
        >
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.valeur} value={option.valeur}>
              {option.libelle}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          value={valeur}
          required={obligatoire}
          onChange={(e) => onChange(e.target.value)}
          className="admin-champ"
        />
      )}

      {aide && <p className="mt-1.5 text-[0.75rem] text-admin-gris">{aide}</p>}
    </div>
  );
}
