'use client';

import { useRef, useState } from 'react';
import { Alerte, EnTetePage } from '@/components/admin/Elements';
import { PanneauFormulaireMarche } from './PanneauFormulaireMarche';
import { apiAdmin, ApiError } from '@/lib/api';
import type { Article, CategorieArticle, StatutArticle } from '@/lib/types';

/**
 * Éditeur d'article.
 *
 * L'édition se fait en HTML assisté plutôt qu'avec un WYSIWYG complet : la
 * barre d'outils insère les balises autorisées par l'assainisseur du backend,
 * et l'aperçu montre le rendu final. Cela évite d'embarquer TipTap et ses
 * ~200 Ko, et garantit que l'auteur ne produit que du HTML acceptable.
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
  const zoneTexte = useRef<HTMLTextAreaElement>(null);

  /*
   * Identifiant de l'article en base. Il passe de null à une valeur dès la
   * première création réussie : sans cela, un second enregistrement depuis le
   * même écran créerait un doublon au lieu de mettre à jour.
   */
  const [idEnregistre, setIdEnregistre] = useState<number | null>(article?.id ?? null);
  const edition = idEnregistre !== null;

  const [valeurs, setValeurs] = useState({
    titre: article?.titre ?? '',
    slug: article?.slug ?? '',
    extrait: article?.extrait ?? '',
    contenu: article?.contenu ?? '',
    image_url: article?.image_url ?? '',
    categorie: (article?.categorie ?? 'campagnes') as CategorieArticle,
    auteur: article?.auteur ?? '',
    langue: article?.langue ?? 'fr',
    statut: (article?.statut ?? 'draft') as StatutArticle,
    date_publication: article?.date_publication
      ? new Date(article.date_publication).toISOString().slice(0, 16)
      : '',
    meta_title: article?.meta_title ?? '',
    meta_description: article?.meta_description ?? '',
  });

  const [apercu, setApercu] = useState(false);
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [balisesRetirees, setBalisesRetirees] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (champ: keyof typeof valeurs, valeur: string) =>
    setValeurs((courant) => ({ ...courant, [champ]: valeur }));

  /** Entoure la sélection courante d'une balise, ou l'insère au curseur. */
  function inserer(ouverture: string, fermeture: string) {
    const zone = zoneTexte.current;
    if (!zone) return;

    const debut = zone.selectionStart;
    const fin = zone.selectionEnd;
    const selection = valeurs.contenu.slice(debut, fin);
    const nouveau =
      valeurs.contenu.slice(0, debut) +
      ouverture +
      selection +
      fermeture +
      valeurs.contenu.slice(fin);

    maj('contenu', nouveau);

    requestAnimationFrame(() => {
      zone.focus();
      zone.setSelectionRange(debut + ouverture.length, fin + ouverture.length);
    });
  }

  async function soumettre(publier: boolean) {
    setEnvoi(true);
    setErreur('');
    setErreurs([]);
    setBalisesRetirees('');

    const corps = {
      titre: valeurs.titre,
      slug: valeurs.slug || undefined,
      extrait: valeurs.extrait || undefined,
      contenu: valeurs.contenu,
      image_url: valeurs.image_url || undefined,
      categorie: valeurs.categorie,
      auteur: valeurs.auteur || undefined,
      langue: valeurs.langue,
      statut: publier ? 'published' : valeurs.statut,
      date_publication: valeurs.date_publication
        ? new Date(valeurs.date_publication).toISOString()
        : undefined,
      meta_title: valeurs.meta_title || undefined,
      meta_description: valeurs.meta_description || undefined,
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
      if (enregistre.contenu !== valeurs.contenu) {
        maj('contenu', enregistre.contenu);
        setApercu(false);
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
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="etiquette">Contenu *</span>
                  <button
                    type="button"
                    onClick={() => setApercu((courant) => !courant)}
                    className="text-[0.8125rem] font-semibold text-admin-vert hover:underline"
                  >
                    {apercu ? 'Éditer' : 'Aperçu'}
                  </button>
                </div>

                {apercu ? (
                  <div
                    className="article-contenu min-h-[420px] rounded-carte border border-admin-trait bg-white p-6"
                    dangerouslySetInnerHTML={{ __html: valeurs.contenu }}
                  />
                ) : (
                  <>
                    {/*
                      Barre d'outils et zone de saisie dans un seul cadre
                      arrondi : elles se touchent, et deux bordures voisines
                      laissaient une couture visible dès que le cadre a cessé
                      d'être à angles droits.
                    */}
                    <div className="overflow-hidden rounded-carte border border-admin-trait bg-white transition-colors duration-150 focus-within:border-admin-vert focus-within:ring-1 focus-within:ring-admin-vert">
                      <div className="flex flex-wrap gap-1.5 border-b border-admin-trait bg-admin-fond px-3 py-2.5">
                        {[
                          ['Paragraphe', '<p>', '</p>'],
                          ['Titre 2', '<h2>', '</h2>'],
                          ['Titre 3', '<h3>', '</h3>'],
                          ['Gras', '<strong>', '</strong>'],
                          ['Italique', '<em>', '</em>'],
                          ['Liste', '<ul>\n<li>', '</li>\n</ul>'],
                          ['Lien', '<a href="https://">', '</a>'],
                          ['Citation', '<blockquote>', '</blockquote>'],
                          ['Image', '<img src="" alt="" />', ''],
                        ].map(([libelle, ouverture, fermeture]) => (
                          <button
                            key={libelle}
                            type="button"
                            onClick={() => inserer(ouverture, fermeture)}
                            className="rounded-full border border-admin-trait bg-white px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-150 hover:border-admin-encre hover:bg-admin-fond"
                          >
                            {libelle}
                          </button>
                        ))}
                      </div>
                      <textarea
                        ref={zoneTexte}
                        id="contenu"
                        rows={20}
                        value={valeurs.contenu}
                        onChange={(e) => maj('contenu', e.target.value)}
                        className="block w-full resize-y bg-white px-4 py-3.5 font-mono text-[0.8125rem] leading-relaxed text-admin-encre placeholder:text-admin-gris focus:outline-none"
                        placeholder="<p>Votre texte…</p>"
                      />
                    </div>
                    <p className="mt-2 text-[0.75rem] leading-relaxed text-admin-gris">
                      Seules les balises de mise en forme sont conservées. Les scripts et
                      les liens dangereux sont retirés à l’enregistrement.
                    </p>
                  </>
                )}
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
                      Date future : l’article deviendra visible automatiquement à cette
                      date.
                    </p>
                  )}
                </div>

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
              <h2 className="etiquette mb-4">Image à la une</h2>
              <label htmlFor="image_url" className="sr-only">
                URL de l’image
              </label>
              <input
                id="image_url"
                type="url"
                value={valeurs.image_url}
                onChange={(e) => maj('image_url', e.target.value)}
                placeholder="https://…"
                className="admin-champ"
              />
              {valeurs.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={valeurs.image_url}
                  alt=""
                  className="mt-3 h-[120px] w-full object-cover"
                />
              )}
            </div>

            <div className="admin-panneau p-5">
              <h2 className="etiquette mb-4">Référencement</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="slug" className="etiquette mb-2 block">
                    Adresse de la page
                  </label>
                  <input
                    id="slug"
                    value={valeurs.slug}
                    onChange={(e) => maj('slug', e.target.value)}
                    placeholder="générée automatiquement depuis le titre"
                    className="admin-champ font-mono text-[0.8125rem]"
                  />
                  <p className="mt-1.5 text-[0.75rem] text-admin-gris">
                    Fin de l’adresse web de l’article. La modifier après
                    publication casse les liens déjà partagés.
                  </p>
                </div>
                <div>
                  <label htmlFor="meta_title" className="etiquette mb-2 block">
                    Meta title
                  </label>
                  <input
                    id="meta_title"
                    value={valeurs.meta_title}
                    onChange={(e) => maj('meta_title', e.target.value)}
                    className="admin-champ"
                  />
                </div>
                <div>
                  <label htmlFor="meta_description" className="etiquette mb-2 block">
                    Meta description
                  </label>
                  <textarea
                    id="meta_description"
                    rows={3}
                    value={valeurs.meta_description}
                    onChange={(e) => maj('meta_description', e.target.value)}
                    className="admin-champ-multiligne"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
