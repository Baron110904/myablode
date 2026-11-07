'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alerte } from '@/components/admin/Elements';
import { apiAdmin, ApiError } from '@/lib/api';
import { dateHeure } from '@/lib/format';
import type { FormulaireMarche } from '@/lib/types';

const VIDE = {
  titre: 'Inscription à la marche « Sucre à terre »',
  introduction: '',
  date_fermeture: '',
  message_ferme: '',
  date_evenement: '',
  lieu: '',
  parcours: '',
  sur_place: '',
  a_prevoir: '',
  lien_externe: '',
};

/**
 * Réglages du formulaire d'inscription porté par cet article.
 *
 * Les champs du bulletin — nom, prénom, âge, sexe, fonction, ville, quartier,
 * participation passée, motivation — sont fixes : ce sont ceux du formulaire
 * papier de la marche. Ce qui se règle ici, c'est le titre, le texte
 * d'accueil, l'échéance, la fiche pratique et la publication.
 *
 * La fiche pratique — jour, lieu, parcours, ce qui attend sur place et ce
 * qu'il faut apporter — s'affiche en marge du bulletin. Tout y est
 * facultatif, et une ligne laissée vide ne paraît pas.
 *
 * Le panneau n'apparaît qu'une fois l'article enregistré : le formulaire est
 * rattaché à un article, il lui faut donc un identifiant.
 */
export function PanneauFormulaireMarche({ articleId }: { articleId: number | null }) {
  const [valeurs, setValeurs] = useState(VIDE);
  const [publie, setPublie] = useState(false);
  const [existant, setExistant] = useState<FormulaireMarche | null>(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [mode, setMode] = useState<'bulletin' | 'lien'>('bulletin');

  const charger = useCallback(async () => {
    if (articleId === null) return;
    try {
      const formulaire = await apiAdmin<FormulaireMarche | null>(
        `/marche/formulaires/${articleId}`,
      );
      if (!formulaire) return;
      setExistant(formulaire);
      setOuvert(true);
      setPublie(formulaire.publie);
      setValeurs({
        titre: formulaire.titre,
        introduction: formulaire.introduction ?? '',
        // L'input datetime-local attend « AAAA-MM-JJTHH:MM », sans fuseau.
        date_fermeture: formulaire.date_fermeture
          ? new Date(formulaire.date_fermeture).toISOString().slice(0, 16)
          : '',
        message_ferme: formulaire.message_ferme ?? '',
        date_evenement: formulaire.date_evenement
          ? new Date(formulaire.date_evenement).toISOString().slice(0, 16)
          : '',
        lieu: formulaire.lieu ?? '',
        parcours: formulaire.parcours ?? '',
        sur_place: formulaire.sur_place ?? '',
        a_prevoir: formulaire.a_prevoir ?? '',
        lien_externe: formulaire.lien_externe ?? '',
      });
      // Le mode suit ce qui est déjà enregistré : un formulaire qui porte une
      // adresse externe s'ouvre sur l'onglet correspondant.
      setMode(formulaire.lien_externe ? 'lien' : 'bulletin');
    } catch {
      /* Aucun formulaire sur cet article : le panneau reste replié. */
    }
  }, [articleId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  async function enregistrer() {
    if (articleId === null) return;
    setEnvoi(true);
    setErreur('');
    try {
      const formulaire = await apiAdmin<FormulaireMarche>(
        `/marche/formulaires/${articleId}`,
        {
          method: 'PUT',
          body: {
            titre: valeurs.titre.trim(),
            /*
             * `null` et non `undefined` : `JSON.stringify` laisse tomber les
             * propriétés indéfinies, et le serveur n'aurait alors aucun moyen
             * de distinguer « champ vidé » de « champ non transmis ». Une
             * date de clôture posée par erreur ne pouvait plus être retirée.
             */
            introduction: valeurs.introduction.trim() || null,
            message_ferme: valeurs.message_ferme.trim() || null,
            date_fermeture: valeurs.date_fermeture
              ? new Date(valeurs.date_fermeture).toISOString()
              : null,
            date_evenement: valeurs.date_evenement
              ? new Date(valeurs.date_evenement).toISOString()
              : null,
            lieu: valeurs.lieu.trim() || null,
            parcours: valeurs.parcours.trim() || null,
            sur_place: valeurs.sur_place.trim() || null,
            a_prevoir: valeurs.a_prevoir.trim() || null,
            /*
              Le mode fait autorité : repasser au bulletin efface l'adresse
              externe, sinon l'article continuerait d'y mener alors que
              l'administrateur a changé d'avis.
            */
            lien_externe: mode === 'lien' ? valeurs.lien_externe.trim() || null : null,
            publie,
          },
        },
      );
      setExistant(formulaire);
      setMessage(
        publie
          ? 'Formulaire publié : il apparaît sur l’article une fois celui-ci publié.'
          : 'Réglages enregistrés. Le formulaire n’est pas encore visible.',
      );
    } catch (attrapee) {
      setErreur(
        attrapee instanceof ApiError ? attrapee.message : 'Enregistrement impossible.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer() {
    if (articleId === null || !existant) return;
    setEnvoi(true);
    try {
      await apiAdmin(`/marche/formulaires/${articleId}`, { method: 'DELETE' });
      setExistant(null);
      setPublie(false);
      setValeurs(VIDE);
      setMessage('Formulaire retiré de l’article.');
    } catch (attrapee) {
      setErreur(attrapee instanceof ApiError ? attrapee.message : 'Retrait impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  if (articleId === null) {
    return (
      <div className="admin-panneau p-5">
        <h3 className="etiquette">Formulaire d’inscription</h3>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-admin-gris">
          Enregistrez d’abord l’article. Le formulaire s’y rattache ensuite.
        </p>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <div className="admin-panneau p-5">
        <h3 className="etiquette">Formulaire d’inscription</h3>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-admin-gris">
          Ajoutez un bulletin d’inscription à la marche sous cet article.
        </p>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="admin-bouton-clair mt-4 w-full"
        >
          Ajouter un formulaire
        </button>
      </div>
    );
  }

  return (
    <div className="admin-panneau p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="etiquette">Formulaire d’inscription</h3>
        {existant && (
          <span className={`pastille ${publie ? 'pastille-normal' : 'pastille-neutre'}`}>
            {publie ? 'Publié' : 'Brouillon'}
          </span>
        )}
      </div>

      {message && (
        <div className="mt-4">
          <Alerte type="succes" onFermer={() => setMessage('')}>
            {message}
          </Alerte>
        </div>
      )}
      {erreur && (
        <div className="mt-4">
          <Alerte type="erreur" onFermer={() => setErreur('')}>
            {erreur}
          </Alerte>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="fm-titre" className="etiquette mb-2 block">
            Titre affiché
          </label>
          <input
            id="fm-titre"
            value={valeurs.titre}
            onChange={(e) => maj('titre', e.target.value)}
            className="admin-champ"
          />
        </div>

        {/*
          Le lieu de l'inscription se choisit d'abord, et les champs suivent.
          Les deux séries étaient auparavant affichées ensemble : on réglait
          une fiche pratique dont personne ne verrait rien parce qu'un lien
          externe était renseigné plus haut.
        */}
        <div className="rounded-carte border border-admin-trait p-4">
          <p className="etiquette mb-3">Où s’inscrit-on ?</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['bulletin', 'Sur le site'],
                ['lien', 'Sur un autre site'],
              ] as const
            ).map(([valeur, libelle]) => (
              <button
                key={valeur}
                type="button"
                onClick={() => setMode(valeur)}
                aria-pressed={mode === valeur}
                className={`rounded-full px-4 py-2 text-[0.8125rem] font-semibold transition-colors ${
                  mode === valeur
                    ? 'bg-admin-nuit text-white'
                    : 'bg-admin-fond text-admin-gris hover:text-admin-encre'
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[0.75rem] leading-relaxed text-admin-gris">
            {mode === 'lien'
              ? 'Le bouton de l’article mène à l’adresse ci-dessous. Le bulletin du site n’est pas proposé, et les inscriptions ne sont pas comptées ici.'
              : 'Les inscriptions se remplissent sur le site et arrivent dans Messages, onglet « Marche ».'}
          </p>
        </div>

        {mode === 'lien' ? (
          <div>
            <label htmlFor="fm-lien" className="etiquette mb-2 block">
              Adresse d’inscription
            </label>
            <input
              id="fm-lien"
              type="url"
              inputMode="url"
              value={valeurs.lien_externe}
              onChange={(e) => maj('lien_externe', e.target.value)}
              placeholder="https://..."
              className="admin-champ"
            />
          </div>
        ) : (
          <>
        <div>
          <label htmlFor="fm-intro" className="etiquette mb-2 block">
            Texte d’accueil
          </label>
          <textarea
            id="fm-intro"
            rows={3}
            value={valeurs.introduction}
            onChange={(e) => maj('introduction', e.target.value)}
            placeholder="Rendez-vous, parcours, ce qu’il faut prévoir…"
            className="admin-champ-multiligne"
          />
        </div>

        <div>
          <label htmlFor="fm-fermeture" className="etiquette mb-2 block">
            Clôture des inscriptions
          </label>
          <input
            id="fm-fermeture"
            type="datetime-local"
            value={valeurs.date_fermeture}
            onChange={(e) => maj('date_fermeture', e.target.value)}
            className="admin-champ"
          />
          <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
            Affichée en grand sur le site. Sans date, le formulaire reste ouvert
            jusqu’à ce que vous le dépubliiez.
          </p>
        </div>

        <div className="rounded-carte border border-admin-trait p-4">
          <p className="etiquette">Fiche pratique</p>
          <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
            Affichée en marge du bulletin. Laissez vide ce que vous ne voulez pas
            montrer.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="fm-jour" className="etiquette mb-2 block">
                Jour et heure de départ
              </label>
              <input
                id="fm-jour"
                type="datetime-local"
                value={valeurs.date_evenement}
                onChange={(e) => maj('date_evenement', e.target.value)}
                className="admin-champ"
              />
            </div>

            <div>
              <label htmlFor="fm-lieu" className="etiquette mb-2 block">
                Lieu
              </label>
              <input
                id="fm-lieu"
                value={valeurs.lieu}
                onChange={(e) => maj('lieu', e.target.value)}
                placeholder="Place de l’Amazone, Cotonou"
                className="admin-champ"
              />
            </div>

            <div>
              <label htmlFor="fm-parcours" className="etiquette mb-2 block">
                Parcours
              </label>
              <input
                id="fm-parcours"
                value={valeurs.parcours}
                onChange={(e) => maj('parcours', e.target.value)}
                placeholder="5 km"
                className="admin-champ"
              />
            </div>

            <div>
              <label htmlFor="fm-surplace" className="etiquette mb-2 block">
                Sur place
              </label>
              <input
                id="fm-surplace"
                value={valeurs.sur_place}
                onChange={(e) => maj('sur_place', e.target.value)}
                placeholder="Dépistage gratuit et don de sang"
                className="admin-champ"
              />
            </div>

            <div>
              <label htmlFor="fm-prevoir" className="etiquette mb-2 block">
                À prévoir
              </label>
              <textarea
                id="fm-prevoir"
                rows={3}
                value={valeurs.a_prevoir}
                onChange={(e) => maj('a_prevoir', e.target.value)}
                placeholder={'Une tenue et des chaussures de sport\nUne bouteille d’eau\nUne pièce d’identité'}
                className="admin-champ-multiligne"
              />
              <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
                Une ligne par élément. Chacune devient une puce sur le site.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="fm-ferme" className="etiquette mb-2 block">
            Message une fois clos
          </label>
          <textarea
            id="fm-ferme"
            rows={2}
            value={valeurs.message_ferme}
            onChange={(e) => maj('message_ferme', e.target.value)}
            placeholder="Les inscriptions sont terminées. Rendez-vous le jour de la marche."
            className="admin-champ-multiligne"
          />
        </div>
          </>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-carte bg-admin-fond px-4 py-3">
          <input
            type="checkbox"
            checked={publie}
            onChange={(e) => setPublie(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-admin-trait accent-admin-vert"
          />
          <span className="text-[0.8125rem] leading-relaxed">
            Publier le formulaire sur l’article
          </span>
        </label>

        {existant?.date_fermeture && publie && (
          <p className="text-[0.75rem] leading-relaxed text-admin-gris">
            Clôture enregistrée : {dateHeure(existant.date_fermeture)}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={envoi || valeurs.titre.trim().length < 3}
            onClick={() => void enregistrer()}
            className="admin-bouton flex-1"
          >
            {envoi ? 'Enregistrement…' : 'Enregistrer le formulaire'}
          </button>
          {existant && (
            <button
              type="button"
              disabled={envoi}
              onClick={() => void retirer()}
              className="admin-bouton-clair"
            >
              Retirer
            </button>
          )}
        </div>

        {existant && (
          <p className="text-[0.75rem] leading-relaxed text-admin-gris">
            Les inscriptions arrivent dans Messages, onglet « Marche ».
          </p>
        )}
      </div>
    </div>
  );
}
