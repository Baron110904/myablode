import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  adresseExterneSure,
  joursRestants,
} from '@/components/public/AppelInscription';
import { FormulaireMarche } from '@/components/public/FormulaireMarche';
import { apiPublic, apiPublicOuDefaut } from '@/lib/api';
import { dateHeure } from '@/lib/format';
import type { Article, FormulaireMarchePublic } from '@/lib/types';

const FUSEAU_BENIN = 'Africa/Porto-Novo';

async function charger(slug: string) {
  // Route publique par identifiant d'URL : `/articles/:id` est réservée au
  // back-office et répondrait 401.
  const article = await apiPublic<Article>(
    `/articles/slug/${encodeURIComponent(slug)}`,
  ).catch(() => null);
  if (!article) return null;

  const formulaire = await apiPublicOuDefaut<FormulaireMarchePublic | null>(
    `/marche/formulaire/${article.id}`,
    null,
  );
  return formulaire ? { article, formulaire } : null;
}

/*
 * Depuis Next 15, `params` et `searchParams` arrivent sous forme de
 * promesses : le rendu peut commencer avant que la requete soit
 * entierement analysee. Il faut donc les attendre avant de les lire.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const donnees = await charger((await params).slug);
  if (!donnees) return { title: 'Inscription' };

  return {
    title: donnees.formulaire.titre,
    description: donnees.formulaire.introduction ?? undefined,
    /* Page de saisie : rien à indexer, tout est déjà dans l'article. */
    robots: { index: false, follow: true },
  };
}

/**
 * Page d'inscription à la marche.
 *
 * Une page pour une tâche. L'article raconte la marche et porte un bouton ;
 * ici on ne fait que remplir le bulletin.
 *
 * Le bandeau de tête reprend la photographie de l'article et rappelle en
 * pastilles ce qu'il faut savoir avant de saisir : l'échéance, le jour, le
 * lieu, la distance. Ces informations vivaient dans le texte d'introduction,
 * où elles se lisaient après coup.
 *
 * Elle n'existe que si un formulaire est publié sur l'article : sinon 404,
 * plutôt qu'une page vide accessible par une adresse devinée.
 */
export default async function PageInscriptionMarche({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const donnees = await charger((await params).slug);
  if (!donnees) notFound();

  const { article, formulaire } = donnees;

  /*
   * Inscriptions ouvertes ailleurs : cette page n'a plus lieu d'être, et le
   * bulletin qu'elle porte constituerait une seconde liste de participants.
   * Les adresses déjà partagées continuent de mener à l'inscription - là où
   * elle se tient désormais - plutôt que vers une 404.
   */
  const lienExterne = adresseExterneSure(formulaire.lienExterne);
  if (lienExterne) redirect(lienExterne);
  const retour = `/actualites/${article.slug}`;

  const jour = formulaire.dateEvenement ? new Date(formulaire.dateEvenement) : null;
  const jourValide = jour && !Number.isNaN(jour.getTime()) ? jour : null;

  /*
   * Le quantième est isolé du mois pour le composer en très gros caractères,
   * comme sur un éphéméride. Tout est calé sur le fuseau du Bénin : rendue
   * depuis un serveur européen, une date du 14 à 00 h 30 s'affichait le 13.
   */
  const quantieme = jourValide
    ? jourValide.toLocaleDateString('fr-FR', {
        day: 'numeric',
        timeZone: FUSEAU_BENIN,
      })
    : null;
  const moisAnnee = jourValide
    ? jourValide.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
        timeZone: FUSEAU_BENIN,
      })
    : null;
  const jourComplet = jourValide
    ? jourValide.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: FUSEAU_BENIN,
      })
    : null;

  /*
   * Lecture defensive de la fiche pratique.
   *
   * Ces champs sont nes avec la refonte : une API anterieure, ou simplement
   * pas encore redemarree, renvoie un formulaire sans eux. Lire la longueur
   * d'un tableau absent faisait alors echouer le rendu serveur et la page
   * entiere disparaissait - pour un encadre facultatif. Mieux vaut une fiche
   * incomplete qu'une inscription impossible.
   */
  const aPrevoir = Array.isArray(formulaire.aPrevoir) ? formulaire.aPrevoir : [];

  const reperes = [jourComplet, formulaire.lieu, formulaire.parcours].filter(Boolean);
  const fiche = [
    { intitule: 'Lieu', valeur: formulaire.lieu },
    { intitule: 'Parcours', valeur: formulaire.parcours },
    { intitule: 'Sur place', valeur: formulaire.surPlace },
  ].filter((ligne) => Boolean(ligne.valeur));

  return (
    <>
      {/* ─── Bandeau de tête ──────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-ablode-profond text-white">
        {article.image_url && (
          /*
            `overflow-hidden` sur le conteneur : la photographie est cadrée en
            `cover` et déborderait sinon du voile qui fait la couture avec
            l'aplat sombre, laissant une bande d'image crue sur le bord.
          */
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 hidden w-[45%] overflow-hidden lg:block"
          >
            <Image
              src={article.image_url}
              alt=""
              fill
              priority
              sizes="45vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-voile-heros" />
          </div>
        )}

        <div className="conteneur relative pb-20 pt-10 lg:pb-28 lg:pt-12">
          <Link
            href={retour}
            className="inline-block py-1 text-[0.9375rem] font-medium text-white/60 transition-colors hover:text-white"
          >
            ← Retour à l’article
          </Link>

          <div className="mt-8 max-w-2xl">
            <p className="text-etiquette uppercase text-ablode-vert-clair">
              {article.titre}
            </p>
            <h1 className="mt-4 text-[2.25rem] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[3rem]">
              {formulaire.titre}
            </h1>

            <div className="mt-7 flex flex-wrap gap-2.5">
              {formulaire.ouvert && formulaire.dateFermeture && (
                <span className="inline-flex items-center gap-2 rounded-full bg-ablode-vert px-4 py-2 text-[0.875rem] font-semibold text-white">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-white" />
                  Clôture le {dateHeure(formulaire.dateFermeture)}
                  <span className="font-normal text-white/80">
                    · {joursRestants(formulaire.dateFermeture)}
                  </span>
                </span>
              )}
              {!formulaire.ouvert && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[0.875rem] font-semibold text-white/80">
                  Inscriptions closes
                </span>
              )}
              {reperes.map((repere) => (
                <span
                  key={repere}
                  className="inline-flex items-center rounded-full bg-white/[0.08] px-4 py-2 text-[0.875rem] text-white/85 ring-1 ring-inset ring-white/15"
                >
                  {repere}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/*
        Le bulletin chevauche le bas du bandeau : la maquette le fait monter
        dans la photographie plutôt que le poser dessous, ce qui rattache la
        saisie à l'événement au lieu d'en faire une page administrative
        détachée.
      */}
      <div className="conteneur relative z-10 -mt-12 pb-16 lg:-mt-16">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <div>
            {formulaire.ouvert ? (
              <FormulaireMarche formulaire={formulaire} retour={retour} />
            ) : (
              <div className="rounded-bloc border border-ablode-trait bg-white p-8 text-center shadow-relief sm:p-12">
                <p className="etiquette">Inscriptions closes</p>
                <p className="mx-auto mt-4 max-w-lg text-[1.0625rem] leading-relaxed">
                  {formulaire.messageFerme?.trim() ||
                    'Les inscriptions à la marche sont terminées.'}
                </p>
                {formulaire.dateFermeture && (
                  <p className="mt-2 text-[0.9375rem] text-ablode-gris">
                    Clôturées le {dateHeure(formulaire.dateFermeture)}
                  </p>
                )}
                <Link href={retour} className="bouton-secondaire mt-7">
                  Revenir à l’article
                </Link>
              </div>
            )}

            {formulaire.introduction && (
              <p className="mt-6 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ablode-gris">
                {formulaire.introduction}
              </p>
            )}
          </div>

          {/*
            Colonne de droite : la fiche pratique, renseignée au back-office.
            Chaque bloc disparaît quand il est vide plutôt que d'afficher un
            intitulé sans valeur — un formulaire sans lieu ni parcours garde
            ainsi une mise en page nette.
          */}
          <aside className="space-y-4">
            {(quantieme || fiche.length > 0) && (
              <div className="rounded-carte bg-ablode-profond p-7 text-white">
                <p className="text-etiquette uppercase text-ablode-vert-clair">
                  Le jour J
                </p>

                {quantieme && (
                  <p className="mt-4 flex items-baseline gap-3">
                    <span className="text-[3rem] font-bold leading-none tracking-[-0.03em]">
                      {quantieme}
                    </span>
                    <span className="text-[1.0625rem] font-medium leading-snug text-white/75">
                      {moisAnnee}
                    </span>
                  </p>
                )}

                {fiche.length > 0 && (
                  <dl
                    className={`divide-y divide-white/10 border-t border-white/10 ${
                      quantieme ? 'mt-6' : 'mt-5'
                    }`}
                  >
                    {fiche.map((ligne) => (
                      <div
                        key={ligne.intitule}
                        className="grid grid-cols-[6rem_1fr] gap-3 py-3.5"
                      >
                        <dt className="text-[0.875rem] text-white/50">
                          {ligne.intitule}
                        </dt>
                        <dd className="text-[0.9375rem] leading-snug">{ligne.valeur}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}

            {aPrevoir.length > 0 && (
              <div className="rounded-carte border border-ablode-trait bg-white p-7">
                <p className="text-etiquette uppercase text-ablode-vert">À prévoir</p>
                <ul className="mt-4 space-y-2.5">
                  {aPrevoir.map((element) => (
                    <li
                      key={element}
                      className="flex gap-3 text-[0.9375rem] leading-relaxed"
                    >
                      <span
                        aria-hidden
                        className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ablode-vert"
                      />
                      {element}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
