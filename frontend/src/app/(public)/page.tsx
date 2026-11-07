import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChiffresCles } from '@/components/public/ChiffresCles';
import { DonneesEvenements } from '@/components/public/DonneesStructurees';
import {
  ChronologieEdition,
  EncartGrandesDates,
} from '@/components/public/ChronologieEdition';
import { FormulaireNewsletter } from '@/components/public/FormulaireNewsletter';
import { LeconsPrevention } from '@/components/public/LeconsPrevention';
import { ImageArticle } from '@/components/public/ImageArticle';
import { Reveler } from '@/components/public/Reveler';
import { apiPublicOuDefaut } from '@/lib/api';
import {
  date,
  decomposerEdition,
  editionNormalisee,
  jourBenin,
  LIBELLES_CATEGORIE,
  typographieFr,
} from '@/lib/format';
import type {
  Article,
  CampagneAccueil,
  Evenement,
  ResumeStats,
} from '@/lib/types';

/** Aucune édition saisie : le bandeau affiche le titre seul. */
const CAMPAGNE_VIDE: CampagneAccueil = { edition: null };

/**
 * L'accueil n'avait pas de métadonnées propres : il héritait du titre du
 * gabarit racine, sans adresse canonique. Elle est indispensable ici — la
 * page est atteignable par « / » comme par le domaine nu, et les moteurs y
 * voyaient deux adresses pour un même contenu.
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
    title: 'MyABLODE - Dépistage du diabète et de l’obésité au Bénin',
    images: ['/depistage.jpg'],
  },
};

/** Chiffres rafraîchis toutes les 5 minutes (section 3.1.1). */
export const revalidate = 300;

const RESUME_VIDE: ResumeStats = {
  totalDepistages: 0,
  casDetectes: 0,
  preDiabete: 0,
  orientesCentre: 0,
  communesCouvertes: 0,
  totalCommunes: 77,
  campagnesRealisees: 0,
  tauxPrevalence: 0,
  variationDepistages7j: 0,
  variationCas7j: 0,
};

/**
 * Teintes des pastilles numérotées, relevées sur la maquette : vert, bleu,
 * ambre. Elles ne hiérarchisent rien — elles distinguent trois actions de
 * même rang, là où trois pastilles vertes se seraient confondues.
 */
const TEINTES_ACTION = [
  'bg-ablode-vert-voile text-ablode-vert-sombre',
  'bg-ablode-ciel-voile text-ablode-ciel-sombre',
  'bg-ablode-ambre-voile text-ablode-ambre',
];

const ACTIONS = [
  {
    numero: '01',
    titre: 'Dépistage gratuit',
    texte:
      "Des tests de glycémie et des mesures d'IMC proposés gratuitement lors de campagnes de terrain, commune par commune.",
  },
  {
    numero: '02',
    titre: typographieFr('Marche « Sucre à terre »'),
    texte:
      "Un événement sportif de 5 km qui remet l'activité physique au cœur de la prévention du diabète de type 2.",
  },
  {
    numero: '03',
    titre: 'Le diabète et nous',
    texte:
      'Un programme de sensibilisation aux dangers du diabète et du pied diabétique, animé avec des soignants.',
  },
];

export default async function PageAccueil() {
  const t = await getTranslations('accueil');
  const tNews = await getTranslations('newsletter');

  // Appels indépendants : les lancer en parallèle évite d'additionner leurs
  // latences dans le temps de rendu de la page.
  const [resume, articles, evenements, campagne] = await Promise.all([
    apiPublicOuDefaut<ResumeStats>('/stats/resume', RESUME_VIDE, {
      params: { periode: 'tout' },
    }),
    apiPublicOuDefaut<Article[]>('/articles/recents', []),
    apiPublicOuDefaut<Evenement[]>('/evenements/publics', []),
    apiPublicOuDefaut<CampagneAccueil>('/evenements/campagne', CAMPAGNE_VIDE),
  ]);

  /*
   * Un seul instant de référence pour toute la page : le bandeau et l'encart
   * affichent le même programme, ils doivent compter les jours depuis le
   * même point.
   */
  const aujourdhui = jourBenin();

  /*
   * Le titre, l'édition et les dates du bandeau viennent du back-office, et
   * non plus de la plus longue date du programme. Un site qui vient
   * d'ouvrir n'a pas encore de programme : il doit pouvoir annoncer sa
   * campagne quand même.
   *
   * La graphie de l'édition varie d'une saisie à l'autre - « 6ème »,
   * « 6e », « 6ᵉ ». Elle est ramenée ici à sa forme composée.
   */
  const edition = campagne.edition;
  const editionChiffre = decomposerEdition(edition);
  const editionTexte = editionNormalisee(edition);

  return (
    <>
      {/* Chaque date du programme est déclarée comme événement indexable. */}
      <DonneesEvenements evenements={evenements} />

      {/* ─── Bandeau de tête ──────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-ablode-profond text-white">
        {/*
          Photographie sur la moitié droite exacte de l'écran, comme sur la
          maquette. Le voile qui la recouvre est opaque à son bord gauche :
          c'est lui qui fait la couture avec l'aplat sombre. Sans cette
          opacité au point de jonction, l'image déborde du dégradé et le
          montage se voit.
        */}
        {/*
          `overflow-hidden` n'est pas décoratif : la respiration lente agrandit
          la photographie de 6 %, soit une vingtaine de pixels qui débordaient
          du cadre de chaque côté. À gauche, ils sortaient du voile et
          laissaient apparaître une bande d'image crue le long de la couture.
        */}
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden lg:block"
        >
          <Image
            src="/depistage.jpg"
            alt=""
            fill
            priority
            sizes="50vw"
            className="animate-zoom-lent object-cover object-center motion-reduce:animate-none"
          />
          <div className="absolute inset-0 bg-voile-heros" />
        </div>

        <div className="conteneur relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:gap-14 lg:py-[4.5rem]">
          <div>
            {/*
              Titre et mention d'édition alignés par le haut : sur la maquette
              le chiffre et la première ligne du titre partent de la même
              hauteur de capitale.

              L'édition est saisie au back-office. Elle était auparavant tirée
              de la première date publiée : vidé le programme, le bandeau
              perdait son « 6ᵉ ».
            */}
            <h1
              className="entree flex flex-wrap items-start gap-x-6 gap-y-2 text-[3rem] font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-[4rem] lg:text-[5rem]"
            >
              {/*
                Le retour à la ligne est porté par la traduction (« Le
                diabète
et nous ») et respecté ici par `whitespace-pre-line`.
                Une largeur maximale aurait aussi coupé le titre au bon
                endroit, mais la boîte serait restée à cette largeur, et le
                bloc « 6ᵉ » s'en serait trouvé repoussé loin du texte. Là, le
                titre tient exactement sa place et la mention le suit.
              */}
              <span className="whitespace-pre-line">{t('titre')}</span>
              {edition && (
                <span className="flex flex-col items-start leading-none text-ablode-vert-clair">
                  <span className="text-[1.4em] leading-[0.82]">
                    {/*
                      Le numéro seul, en très gros ; « édition » le qualifie
                      dessous. L'exposant est une balise à part, et non les
                      lettres saisies : composé en toutes lettres, un
                      « 6ème » triplait la largeur du bloc et le renvoyait
                      sous le titre au lieu de tenir à sa droite.
                    */}
                    {editionChiffre ? (
                      <>
                        {editionChiffre.numero}
                        <sup className="text-[0.42em] font-bold">
                          {editionChiffre.exposant}
                        </sup>
                      </>
                    ) : (
                      edition.replace(/\s*éditions?\s*$/i, '')
                    )}
                  </span>
                  {/* Corps et interlettrage calés sur la largeur relevée
                      (71,5 px pour 80 px de titre), afin que le bloc reste à
                      droite de la première ligne au lieu de passer dessous. */}
                  <span className="mt-2 text-[0.2em] font-bold uppercase tracking-[0.14em]">
                    Édition
                  </span>
                </span>
              )}
            </h1>

            {/*
              Pavé du slogan, incliné de 1,39° — l'angle relevé au pixel sur
              la maquette. `inline-block` garde la boîte à la largeur du
              texte, et la rotation emporte le fond comme le texte, d'un bloc.
              L'angle est écrit `rotate-[-1.39deg]` et non `-rotate-[1.39deg]`
              : sur une valeur arbitraire, le préfixe négatif n'est pas repris
              et la transformation sortait à l'identité.
            */}
            <p
              className="entree mt-10 inline-block origin-left rotate-[-1.39deg] bg-ablode-vert-vif px-6 py-3 text-[1.5rem] font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-[1.875rem]"
              style={{ animationDelay: '90ms' }}
            >
              {t('slogan')}
            </p>

            <p
              className="entree mt-6 max-w-md text-[1.0625rem] leading-relaxed text-white/75"
              style={{ animationDelay: '170ms' }}
            >
              {t('chapeau')}
            </p>

            <div
              className="entree mt-8 flex flex-wrap gap-3"
              style={{ animationDelay: '250ms' }}
            >
              <Link
                href="/resultats"
                className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-7 py-3.5 text-[0.9375rem] font-semibold text-ablode-encre transition-all duration-200 hover:-translate-y-0.5 hover:shadow-relief motion-reduce:hover:translate-y-0"
              >
                {/* Reflet qui balaie le bouton au survol. */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-ablode-vert-clair/25 group-hover:animate-reflet motion-reduce:group-hover:animate-none"
                />
                <span className="relative">{t('voirLesResultats')}</span>
              </Link>
              <Link
                href="/a-propos"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-[0.9375rem] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/5 motion-reduce:hover:translate-y-0"
              >
                {t('decouvrirAssociation')}
              </Link>
            </div>
          </div>

          {/* Sur mobile, la photo passe sous le texte plutôt que derrière. */}
          <div
            className="entree relative h-[260px] overflow-hidden rounded-carte sm:h-[340px] lg:hidden"
            style={{ animationDelay: '320ms' }}
          >
            <Image
              src="/depistage.jpg"
              alt="Test de glycémie capillaire réalisé lors d’un dépistage de l’ABLODE"
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ─── Rendez-vous de l'édition ─────────────────────────────────── */}
      {evenements.length > 0 && (
        <section
          /*
            Dans la continuité du bandeau de tête, et non plus sur une carte
            blanche qui lui passait devant : ces dates sont celles de la
            campagne annoncée au-dessus. Un vert nuit à peine plus clair
            suffit à les en détacher.
          */
          className="relative z-10 bg-ablode-nuit text-white"
          aria-labelledby="titre-programme"
        >
          <div className="conteneur">
            {/*
              Le bandeau enchaîne des titres d'événements en `h3` juste après
              le `h1`. Sans ce `h2`, la hiérarchie sautait un niveau : une
              personne qui parcourt la page au lecteur d'écran, de titre en
              titre, tombait sur des dates sans savoir ce qu'elles énumèrent.
              Le titre est masqué visuellement, la maquette ne le montrant pas.
            */}
            <h2 id="titre-programme" className="sr-only">
              Rendez-vous{editionTexte ? ` de la ${editionTexte}` : ''}
            </h2>
            {/*
              Les cellules reprennent à leur compte le rembourrage du
              conteneur, pour que le fond de la date en cours file jusqu'au
              bord sans décaler le texte vers l'intérieur.
            */}
            <div className="-mx-5 sm:-mx-8">
              <ChronologieEdition evenements={evenements} aujourdhui={aujourdhui} />
            </div>
          </div>
        </section>
      )}

      {/*
        ─── Chiffres clés ──────────────────────────────────────────────
        La bande n'apparaît qu'une fois les premiers dépistages saisis.
        Tant qu'il n'y en a aucun, elle annonçait « 0 dépistage réalisé,
        0 commune couverte, 0,0 % de prévalence » : quatre zéros alignés en
        gros caractères, qui donnent d'une association qui démarre l'image
        d'une association qui échoue.
      */}
      {resume.totalDepistages > 0 && (
      <section className="conteneur border-b border-ablode-trait py-12">
        <Reveler>
          {/*
            Un filet vert devant chaque chiffre, comme sur la maquette : il
            rattache visuellement la colonne au reste de la charte.
          */}
          <div className="[&_dl>div]:border-l-2 [&_dl>div]:border-ablode-vert [&_dl>div]:pl-5">
            <ChiffresCles resume={resume} />
          </div>
        </Reveler>
      </section>
      )}

      {/* ─── Les cinq leçons de prévention ────────────────────────────── */}
      <LeconsPrevention />

      {/* ─── Nos actions ──────────────────────────────────────────────── */}
      <section className="bg-ablode-voile">
        <div className="conteneur py-16">
          <Reveler>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-etiquette uppercase text-ablode-vert">
                  Ce que nous faisons
                </p>
                <h2 className="mt-3 titre-section">{t('missions')}</h2>
              </div>
              <Link
                href="/resultats"
                className="group inline-block shrink-0 py-1 text-[0.9375rem] font-semibold text-ablode-vert transition-colors hover:text-ablode-vert-sombre"
              >
                {t('voirResultats')}{' '}
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </Reveler>

          {/*
            Trois colonnes égales, et l'encart des dates en bandeau sous
            elles. Il tenait auparavant une quatrième colonne, où ses quatre
            dates s'empilaient en une liste étroite et serrée ; sur toute la
            largeur, elles se lisent côte à côte comme un programme.
          */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIONS.map((action, index) => (
              <Reveler as="article" key={action.titre} delai={index * 90}>
                <div className="carte-contenu group h-full p-7 hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-[0.875rem] font-bold ${TEINTES_ACTION[index % TEINTES_ACTION.length]}`}
                  >
                    {action.numero}
                  </span>
                  <h3 className="mt-6 text-base font-bold leading-snug">{action.titre}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                    {action.texte}
                  </p>
                </div>
              </Reveler>
            ))}
          </div>

          <Reveler delai={ACTIONS.length * 90} className="mt-4">
            <EncartGrandesDates evenements={evenements} edition={editionTexte} />
          </Reveler>
        </div>
      </section>

      {/* ─── Sur le terrain ───────────────────────────────────────────── */}
      <section className="conteneur py-16">
        <Reveler>
          <div className="mb-10 flex items-end justify-between gap-6">
            <h2 className="titre-section">{t('surLeTerrain')}</h2>
            <Link
              href="/actualites"
              className="group inline-block shrink-0 py-1 text-[0.9375rem] font-semibold text-ablode-vert transition-colors hover:text-ablode-vert-sombre"
            >
              {t('toutesActualites')}{' '}
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </div>
        </Reveler>

        {articles.length === 0 ? (
          <p className="text-sm text-ablode-gris">{t('aucuneActualite')}</p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, index) => (
              <Reveler as="li" key={article.id} delai={index * 90}>
                <Link
                  href={`/actualites/${article.slug}`}
                  className="carte-contenu group flex h-full flex-col hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0"
                >
                  <div className="overflow-hidden border-b border-ablode-trait">
                    <ImageArticle
                      src={article.image_url}
                      hauteur={190}
                      largeur={520}
                      className="transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="pastille-categorie">
                        {LIBELLES_CATEGORIE[article.categorie]}
                      </span>
                      <span className="text-[0.8125rem] text-ablode-gris">
                        {date(article.date_publication)}
                      </span>
                    </div>

                    <h3 className="text-[1.0625rem] font-bold leading-snug tracking-[-0.015em] transition-colors group-hover:text-ablode-vert-sombre">
                      {article.titre}
                    </h3>
                    {article.extrait && (
                      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                        {article.extrait}
                      </p>
                    )}
                  </div>
                </Link>
              </Reveler>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Newsletter ───────────────────────────────────────────────── */}
      <section className="conteneur pb-4">
        <Reveler>
          <div className="rounded-bloc bg-ablode-vert px-8 py-11 sm:px-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="text-2xl font-bold text-white">{tNews('titre')}</h2>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-white/80">
                  {tNews('chapeau')}
                </p>
              </div>
              <FormulaireNewsletter variante="sombre" />
            </div>
          </div>
        </Reveler>
      </section>
    </>
  );
}
