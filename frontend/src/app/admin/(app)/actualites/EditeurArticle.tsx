'use client';

import { useState } from 'react';
import { Alerte, EnTetePage } from '@/components/admin/Elements';
import { PanneauFormulaireMarche } from './PanneauFormulaireMarche';
import { ChampImage } from '@/components/admin/ChampImage';
import { EditeurContenu } from '@/components/admin/EditeurContenu';
import { apiAdmin, ApiError } from '@/lib/api';
import { memeContenu } from '@/lib/html';
import type { Article, CategorieArticle, StatutArticle } from '@/lib/types';

/**
 * Éditeur d'article.
 *
 * La mise en forme se fait dans un éditeur visuel : écrire une actualité ne
 * demande plus de connaître le HTML, qui n'est plus qu'un format de stockage.
 * Le poids de l'éditeur ne pèse que sur le back-office, derrière
 * l'authentification ; le visiteur du site ne le charge jamais.
 *
 * L'aperçu a disparu avec la saisie de balises : on compose directement dans
 * la typographie de la page publique.
 */
export function EditeurArticle({
  article,
  onFermer,
  onEnregistre,
}: {
  article: Article | null;
  onFermer: () => void;
  onEnregistre: (message: string) => void;
}) {
  /*
   * Identifiant de l'article en base. Il passe de null à une valeur dès la
   * première création réussie : sans cela, un second enregistrement depuis le
   * même écran créerait un doublon au lieu de mettre à jour.
   */
  const [idEnregistre, setIdEnregistre] = useState<number | null>(article?.id ?? null);
  const edition = idEnregistre !== null;

  const [valeurs, setValeurs] = useState({
    titre: article?.titre ?? '',
    extrait: article?.extrait ?? '',
    contenu: article?.contenu ?? '',
    image_url: article?.image_url ?? '',
    categorie: (article?.categorie ?? 'campagnes') as CategorieArticle,
    auteur: article?.auteur ?? '',
    langue: article?.langue ?? 'fr',
    statut: (article?.statut ?? 'draft') as StatutArticle,
    date_evenement: article?.date_evenement?.slice(0, 10) ?? '',
    date_publication: article?.date_publication
      ? new Date(article.date_publication).toISOString().slice(0, 16)
      : '',
    date_retrait: article?.date_retrait
      ? new Date(article.date_retrait).toISOString().slice(0, 16)
      : '',
  });

  const [aLaUne, setALaUne] = useState(article?.a_la_une ?? false);
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [balisesRetirees, setBalisesRetirees] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  async function soumettre(publier: boolean) {
    setEnvoi(true);
    setErreur('');
    setErreurs([]);
    setBalisesRetirees('');

    const corps = {
      titre: valeurs.titre,
      extrait: valeurs.extrait || undefined,
      contenu: valeurs.contenu,
      image_url: valeurs.image_url || undefined,
      categorie: valeurs.categorie,
      auteur: valeurs.auteur || undefined,
      langue: valeurs.langue,
      statut: publier ? 'published' : valeurs.statut,
      date_evenement: valeurs.date_evenement || null,
      date_publication: valeurs.date_publication
        ? new Date(valeurs.date_publication).toISOString()
        : undefined,
      a_la_une: aLaUne,
      /*
       * `null` et non `undefined` : `JSON.stringify` laisse tomber les
       * propriétés indéfinies, et l'API ne verrait pas la différence entre
       * « champ vidé » et « champ non transmis ». Une échéance posée par
       * erreur resterait alors impossible à retirer.
       */
      date_retrait: valeurs.date_retrait
        ? new Date(valeurs.date_retrait).toISOString()
        : null,
    };

    try {
      const enregistre =
        idEnregistre !== null
          ? await apiAdmin<Article>(`/articles/${idEnregistre}`, {
              method: 'PATCH',
              body: corps,
            })
          : await apiAdmin<Article>('/articles', { method: 'POST', body: corps });

      const creation = idEnregistre === null;
      setIdEnregistre(enregistre.id);

      /*
       * Le backend retire les balises et attributs non autorisés. Quand le
       * contenu conservé diffère de la saisie, on reste sur l'éditeur avec le
       * texte réellement enregistré : sinon la mise en forme disparaissait
       * sans que l'auteur en soit averti.
       */
      if (!memeContenu(enregistre.contenu, valeurs.contenu)) {
        maj('contenu', enregistre.contenu);
        setBalisesRetirees(
          `L’article est ${creation ? 'créé' : 'enregistré'}, mais certaines balises ou ` +
            'propriétés de style n’étaient pas autorisées et ont été retirées. Le contenu ' +
            'ci-dessous est celui réellement enregistré.',
        );
        return;
      }

      onEnregistre(
        creation
          ? `Article « ${valeurs.titre} » créé.`
          : `Article « ${valeurs.titre} » mis à jour.`,
      );
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

  const publicationFuture =
    valeurs.date_publication && new Date(valeurs.date_publication) > new Date();
  const retraitPasse =
    valeurs.date_retrait && new Date(valeurs.date_retrait) <= new Date();

  return (
    <>
      <EnTetePage
        titre={edition ? 'Modifier l’article' : 'Nouvel article'}
        actions={
          <>
            <button type="button" onClick={onFermer} className="admin-bouton-clair">
              Retour
            </button>
            <button
              type="button"
              onClick={() => void soumettre(false)}
              disabled={envoi || !valeurs.titre || !valeurs.contenu}
              className="admin-bouton-clair"
            >
              Enregistrer le brouillon
            </button>
            <button
              type="button"
              onClick={() => void soumettre(true)}
              disabled={envoi || !valeurs.titre || !valeurs.contenu}
              className="admin-bouton"
            >
              {envoi ? '…' : publicationFuture ? 'Programmer' : 'Publier'}
            </button>
          </>
        }
      />

      <div className="p-6">
        {balisesRetirees && (
          <div className="mb-4">
            <Alerte type="attention" onFermer={() => setBalisesRetirees('')}>
              {balisesRetirees}
            </Alerte>
          </div>
        )}

        {erreur && (
          <div className="mb-4">
            <Alerte type="erreur" onFermer={() => setErreur('')}>
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

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="admin-panneau p-6">
            <div className="space-y-5">
              <div>
                <label htmlFor="titre" className="etiquette mb-2 block">
                  Titre *
                </label>
                <input
                  id="titre"
                  value={valeurs.titre}
                  onChange={(e) => maj('titre', e.target.value)}
                  className="admin-champ text-lg font-bold"
                  placeholder="Titre de l’article"
                />
              </div>

              <div>
                <label htmlFor="extrait" className="etiquette mb-2 block">
                  Extrait
                </label>
                <textarea
                  id="extrait"
                  rows={2}
                  value={valeurs.extrait}
                  onChange={(e) => maj('extrait', e.target.value)}
                  className="admin-champ-multiligne"
                  placeholder="Résumé affiché dans les listes et la newsletter (généré automatiquement si vide)"
                />
              </div>

              <div>
                <span className="etiquette mb-2 block">Contenu *</span>
                <EditeurContenu
                  valeur={valeurs.contenu}
                  onChange={(html) => maj('contenu', html)}
                  desactive={envoi}
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="admin-panneau p-5">
              <h2 className="etiquette mb-4">Publication</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="statut" className="etiquette mb-2 block">
                    Statut
                  </label>
                  <select
                    id="statut"
                    value={valeurs.statut}
                    onChange={(e) => maj('statut', e.target.value)}
                    className="admin-champ"
                  >
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="date_evenement" className="etiquette mb-2 block">
                    Date de l’événement (facultatif)
                  </label>
                  <input
                    id="date_evenement"
                    type="date"
                    value={valeurs.date_evenement}
                    onChange={(e) => maj('date_evenement', e.target.value)}
                    className="admin-champ-multiligne"
                  />
                  <p className="mt-1.5 text-[0.75rem] text-admin-gris">
                    Pour un article qui annonce un rendez-vous. Les cartes du site
                    l’affichent alors à la place de la date de publication, qu’on
                    confondait avec celle de l’événement. Laissez vide pour un compte
                    rendu ou un communiqué.
                  </p>
                </div>

                <div>
                  <label htmlFor="date_publication" className="etiquette mb-2 block">
                    Date de publication
                  </label>
                  <input
                    id="date_publication"
                    type="datetime-local"
                    value={valeurs.date_publication}
                    onChange={(e) => maj('date_publication', e.target.value)}
                    className="admin-champ-multiligne"
                  />
                  {publicationFuture && (
                    <p className="mt-1.5 text-[0.75rem] text-ablode-ambre">
                      Date future: l’article deviendra visible automatiquement à cette
                      date.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="date_retrait" className="etiquette mb-2 block">
                    Date de retrait (facultatif)
                  </label>
                  <input
                    id="date_retrait"
                    type="datetime-local"
                    value={valeurs.date_retrait}
                    onChange={(e) => maj('date_retrait', e.target.value)}
                    className="admin-champ-multiligne"
                  />
                  <p className="mt-1.5 text-[0.75rem] text-admin-gris">
                    {retraitPasse
                      ? 'Date passée: l’article ne figure plus sur le site. Il reste modifiable ici.'
                      : 'Passée cette date, l’article quitte le site mais reste au back-office. Laissez vide pour qu’il y demeure.'}
                  </p>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-carte border border-admin-trait bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    checked={aLaUne}
                    onChange={(e) => setALaUne(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-admin-trait accent-ablode-vert"
                  />
                  <span className="text-[0.8125rem] leading-snug">
                    <span className="font-semibold">À la une</span>
                    <span className="mt-1 block text-[0.75rem] text-admin-gris">
                      Remonte l’article en tête des actualités. Le plus récent des
                      articles à la une occupe le grand encart.
                    </span>
                  </span>
                </label>

                <div>
                  <label htmlFor="categorie" className="etiquette mb-2 block">
                    Catégorie
                  </label>
                  <select
                    id="categorie"
                    value={valeurs.categorie}
                    onChange={(e) => maj('categorie', e.target.value)}
                    className="admin-champ"
                  >
                    <option value="campagnes">Campagnes</option>
                    <option value="sensibilisation">Sensibilisation</option>
                    <option value="resultats">Résultats</option>
                    <option value="evenements">Événements</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="langue" className="etiquette mb-2 block">
                    Langue
                  </label>
                  <select
                    id="langue"
                    value={valeurs.langue}
                    onChange={(e) => maj('langue', e.target.value)}
                    className="admin-champ"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="auteur" className="etiquette mb-2 block">
                    Auteur
                  </label>
                  <input
                    id="auteur"
                    value={valeurs.auteur}
                    onChange={(e) => maj('auteur', e.target.value)}
                    className="admin-champ"
                  />
                </div>
              </div>
            </div>

            {/*
              Le formulaire d'inscription se rattache à l'article : il ne peut
              donc être réglé qu'une fois celui-ci enregistré.
            */}
            <PanneauFormulaireMarche articleId={idEnregistre} />

            <div className="admin-panneau p-5">
              <ChampImage
                valeur={valeurs.image_url}
                onChange={(url) => maj('image_url', url)}
                libelle="Image à la une"
                aide="Affichée en tête de l’article et dans la liste des actualités."
              />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
