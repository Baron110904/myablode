import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { BandePartenaires } from '@/components/public/BandePartenaires';
import { ChiffresCles } from '@/components/public/ChiffresCles';
import { ReseauxSociaux } from '@/components/public/ReseauxSociaux';
import { Reveler } from '@/components/public/Reveler';
import { apiPublicOuDefaut } from '@/lib/api';
import { PARTENAIRES } from '@/lib/association';
import type { ResumeStats } from '@/lib/types';

export const metadata: Metadata = {
  alternates: { canonical: '/a-propos' },
  openGraph: { url: '/a-propos' },
  title: 'À propos',
  description:
    'L’ABLODE, Association Béninoise de Lutte contre l’Obésité, le Diabète ' +
    'et les Endocrinopathies : mission, activités et place dans le système de santé.',
};

export const revalidate = 3600;

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

/** Les trois objectifs statutaires de l'association. */
const OBJECTIFS = [
  {
    numero: '01',
    titre: 'Épauler les soignants',
    texte:
      'Appuyer les acteurs du système de santé dans le diagnostic et la prise en charge ' +
      'des maladies métaboliques et des endocrinopathies.',
  },
  {
    numero: '02',
    titre: 'Accompagner les malades',
    texte:
      'Suivre et assister les personnes atteintes d’une affection métabolique ou ' +
      'endocrinienne, de la détection à l’orientation vers une structure de soin.',
  },
  {
    numero: '03',
    titre: 'Changer les habitudes',
    texte:
      'Promouvoir une alimentation saine et de meilleures habitudes nutritionnelles ' +
      'au sein de la population.',
  },
];

const ACTIVITES = [
  {
    titre: 'Dépistage gratuit',
    accroche: 'Aller au-devant des populations',
    texte:
      'Tests de glycémie capillaire et mesure de l’indice de masse corporelle, ' +
      'gratuitement, commune par commune. Le dépistage permet de repérer des personnes ' +
      'qui ignorent leur état, à un stade où la maladie reste maîtrisable.',
    accent: 'vert' as const,
  },
  {
    titre: 'Marche « Sucre à terre »',
    accroche: 'Cinq kilomètres contre la sédentarité',
    texte:
      'Un événement sportif qui remet l’activité physique au cœur de la prévention du ' +
      'diabète de type 2. La première édition, en novembre 2023, a réuni environ ' +
      '300 marcheurs à Cotonou, de la Place de l’Amazone à la Faculté des sciences de la santé.',
    accent: 'encre' as const,
  },
  {
    titre: 'Le diabète et nous',
    accroche: 'Un mois de sensibilisation chaque année',
    texte:
      'Lancé en novembre 2020 autour de la Journée mondiale du diabète, ce programme ' +
      'informe sur les dangers du diabète et du pied diabétique. Il associe conférences, ' +
      'formations de médecins généralistes, radio, télévision et réseaux sociaux.',
    accent: 'clair' as const,
  },
];

const AXES = [
  {
    numero: '01',
    titre: 'L’orientation des personnes dépistées',
    texte:
      'Lorsqu’une glycémie anormalement élevée ou une obésité critique est repérée, ' +
      'l’association ne prescrit pas de traitement de long terme. Elle oriente la ' +
      'personne vers un centre de santé public, un hôpital ou une clinique partenaire, ' +
      'pour une prise en charge globale et spécialisée. La plateforme trace cette ' +
      'orientation pour chaque dépistage.',
  },
  {
    numero: '02',
    titre: 'La présence de professionnels de santé',
    texte:
      'Conférences, bilans de santé et marche « Sucre à terre » sont encadrés par des ' +
      'médecins, des infirmiers et des spécialistes en diabétologie ou en endocrinologie ' +
      'issus des structures de soin locales.',
  },
  {
    numero: '03',
    titre: 'L’intégration dans les politiques de santé',
    texte:
      'Les associations de lutte contre les maladies non transmissibles travaillent en ' +
      'phase avec les directives du Ministère de la Santé et s’appuient sur le réseau ' +
      'sanitaire national. Les agrégats produits ici sont compatibles avec le suivi ' +
      'épidémiologique national.',
  },
];

export default async function PageAPropos() {
  const t = await getTranslations('aPropos');

  const resume = await apiPublicOuDefaut<ResumeStats>('/stats/resume', RESUME_VIDE, {
    params: { periode: 'tout' },
  });

  return (
    <>
      {/* ─── Bannière sombre ──────────────────────────────────────────── */}
      <section className="bg-ablode-profond text-white">
        <div className="conteneur grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <Reveler>
            <p className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.07] px-4 py-2 text-etiquette uppercase text-ablode-vert-clair">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ablode-vert-clair" />
              Association à but non lucratif · depuis 2018
            </p>
            <h1 className="mt-6 text-[2.5rem] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[3rem]">
              Réduire le nombre de malades du diabète{' '}
              <span className="text-ablode-vert-clair">au Bénin</span>
            </h1>
          </Reveler>

          <Reveler delai={120} className="flex items-end">
            <div className="space-y-5 text-[1.0625rem] leading-relaxed text-white/75">
              <p>
                L’ABLODE - Association Béninoise de Lutte contre l’Obésité, le Diabète et
                les Endocrinopathies, est née en 2018 de l’initiative de médecins
                endocrinologues, de spécialistes d’autres disciplines et de
                professionnels venus d’autres horizons.
              </p>
              <p>
                Basée à Abomey-Calavi, elle intervient sur l’ensemble du territoire
                béninois.
              </p>
            </div>
          </Reveler>
        </div>
      </section>

      {/* Carte des repères, à cheval sur le bas de la bannière. */}
      <section className="relative z-10 -mt-10">
        <div className="conteneur">
          <Reveler delai={160}>
            <dl className="grid grid-cols-2 overflow-hidden rounded-carte border border-ablode-trait bg-white shadow-relief sm:grid-cols-4">
              {[
                { valeur: '2018', libelle: 'Année de création' },
                { valeur: '77', libelle: 'Communes du Bénin' },
                { valeur: '5 km', libelle: 'Marche « Sucre à terre »' },
                { valeur: '3', libelle: 'Objectifs statutaires' },
              ].map((carte, index) => (
                <div
                  key={carte.libelle}
                  className={`group p-7 transition-colors duration-300 hover:bg-ablode-voile ${
                    index > 0 ? 'border-ablode-trait sm:border-l' : ''
                  } ${index === 1 || index === 3 ? 'border-l border-ablode-trait' : ''} ${
                    index > 1 ? 'border-t border-ablode-trait sm:border-t-0' : ''
                  }`}
                >
                  <dd className="text-[2rem] font-bold leading-none tracking-[-0.02em]">
                    {carte.valeur}
                  </dd>
                  <dt className="mt-2.5 text-etiquette uppercase text-ablode-gris transition-colors group-hover:text-ablode-encre">
                    {carte.libelle}
                  </dt>
                </div>
              ))}
            </dl>
          </Reveler>
        </div>
      </section>

      {/* ─── Objectifs, en vert pâle ──────────────────────────────────── */}
      <section className="bg-ablode-voile">
        <div className="conteneur py-16">
          <Reveler>
            <p className="text-etiquette uppercase text-ablode-vert">
              Notre raison d’être
            </p>
            <h2 className="mt-4 titre-section max-w-2xl">{t('mission')}</h2>
          </Reveler>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {OBJECTIFS.map((objectif, index) => (
              <Reveler key={objectif.numero} delai={index * 100}>
                <div className="group h-full rounded-carte border border-ablode-trait border-t-2 border-t-ablode-vert bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-carte motion-reduce:hover:translate-y-0">
                  {/*
                    Le numéro était composé en `ablode-voile` sur fond blanc :
                    illisible. La maquette le veut vert, et c'est le seul
                    repère de progression de la série.
                  */}
                  <p className="text-[2rem] font-bold leading-none text-ablode-vert transition-colors duration-300 group-hover:text-ablode-vert-sombre">
                    {objectif.numero}
                  </p>
                  <h3 className="mt-5 text-lg font-bold leading-snug">{objectif.titre}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                    {objectif.texte}
                  </p>
                </div>
              </Reveler>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Activités, cartes contrastées sur fond sombre ────────────── */}
      <section className="bg-ablode-profond">
        <div className="conteneur py-16">
          <Reveler>
            <p className="text-etiquette uppercase text-ablode-vert-clair">
              Sur le terrain
            </p>
            <h2 className="mt-4 titre-section text-white">{t('activites')}</h2>
          </Reveler>

          <div className="mt-10 space-y-4">
            {ACTIVITES.map((activite, index) => {
              const styles = {
                vert: 'bg-ablode-vert text-white',
                // Sur fond profond, la carte neutre s'éclaircit à peine :
                // elle se distingue par son contour, pas par son aplat.
                encre: 'bg-white/[0.04] text-white ring-1 ring-inset ring-white/10',
                clair: 'bg-white text-ablode-encre',
              }[activite.accent];

              const secondaire =
                activite.accent === 'clair' ? 'text-ablode-gris' : 'text-white/75';
              const surtitre =
                activite.accent === 'clair' ? 'text-ablode-vert' : 'text-white/60';
              const numero =
                activite.accent === 'clair' ? 'text-ablode-trait' : 'text-white/25';

              return (
                <Reveler key={activite.titre} delai={index * 90}>
                  <article
                    className={`grid items-start gap-5 rounded-carte p-8 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 sm:grid-cols-[auto_1fr_1.5fr] sm:gap-10 sm:p-10 ${styles}`}
                  >
                    <span
                      aria-hidden
                      className={`text-[0.8125rem] font-bold ${numero}`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className={`text-etiquette uppercase ${surtitre}`}>
                        {activite.accroche}
                      </p>
                      <h3 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.02em]">
                        {activite.titre}
                      </h3>
                    </div>
                    <p className={`text-[1.0625rem] leading-relaxed ${secondaire}`}>
                      {activite.texte}
                    </p>
                  </article>
                </Reveler>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Chiffres de la plateforme ────────────────────────────────── */}
      <section className="border-y border-ablode-trait bg-white">
        <div className="conteneur py-12">
          <Reveler>
            <p className="etiquette mb-8">Ce que la plateforme a consolidé à ce jour</p>
            <ChiffresCles resume={resume} />
          </Reveler>
        </div>
      </section>

      {/* ─── Place dans le système de santé ───────────────────────────── */}
      <section className="conteneur py-16">
        <Reveler>
          <div className="max-w-2xl">
            <p className="text-etiquette uppercase text-ablode-vert">
              Nous ne travaillons pas seuls
            </p>
            <h2 className="mt-4 titre-section">{t('articulation')}</h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ablode-gris">
              Étant une association axée sur la santé publique, l’ABLODE collabore
              régulièrement avec les centres de santé et les structures médicales du
              Bénin, autour de trois axes.
            </p>
          </div>
        </Reveler>

        <ol className="mt-12 grid gap-px bg-ablode-trait lg:grid-cols-3">
          {AXES.map((axe, index) => (
            <Reveler as="li" key={axe.numero} delai={index * 100}>
              <div className="group h-full bg-ablode-papier p-8 transition-colors duration-300 hover:bg-ablode-voile">
                <span
                  aria-hidden
                  className="mb-6 block h-0.5 w-10 bg-ablode-vert transition-all duration-300 group-hover:w-20"
                />
                <p className="text-etiquette uppercase text-ablode-vert">
                  Axe {axe.numero}
                </p>
                <h3 className="mt-3 text-lg font-bold leading-snug">{axe.titre}</h3>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-ablode-gris">
                  {axe.texte}
                </p>
              </div>
            </Reveler>
          ))}
        </ol>
      </section>

      {/* ─── Partenaires ──────────────────────────────────────────────── */}
      <section className="overflow-hidden bg-ablode-voile">
        <div className="conteneur pt-16">
          <Reveler>
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <p className="text-etiquette uppercase text-ablode-vert">
                  Ils nous accompagnent
                </p>
                <h2 className="mt-4 titre-section">{t('partenaires')}</h2>
              </div>
              <p className="text-[0.9375rem] leading-relaxed text-ablode-gris lg:self-end">
                Institutions, centres de santé publics, hôpitaux de zone, cliniques
                partenaires et entreprises accompagnent les campagnes sur le terrain.
              </p>
            </div>
          </Reveler>
        </div>

        {/*
          La bande déborde volontairement du conteneur : elle traverse l'écran
          d'un bord à l'autre, comme sur la maquette.
        */}
        <Reveler delai={120} className="mt-10 pb-4">
          <BandePartenaires />
        </Reveler>

        {/*
          Version lisible par les lecteurs d'écran et les moteurs : la bande
          animée est masquée pour eux, la liste des partenaires ne doit pas
          disparaître avec elle.
        */}
        <div className="conteneur pb-16">
          <ul className="sr-only">
            {PARTENAIRES.map((partenaire) => (
              <li key={partenaire.nom}>
                {partenaire.nom} : {partenaire.role}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Appels à l'action ────────────────────────────────────────── */}
      <section className="conteneur py-16">
        {/*
          Les trois cartes partagent la même partition : surtitre, titre sur
          une ligne, deux lignes de texte, puis l'action en pied. La hauteur
          d'une rangée étant celle de sa carte la plus haute, tout
          déséquilibre de contenu se payait en vide chez les deux autres : la
          carte des réseaux, avec son paragraphe long et ses trois boutons
          repliés sur deux rangs, creusait un trou de cinquante pixels sous
          « Contacter l'association ».
        */}
        <div className="grid gap-5 sm:grid-cols-3">
          <Reveler>
            <Link
              href="/contact"
              className="group flex h-full flex-col justify-between rounded-carte border border-ablode-trait bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0"
            >
              <div>
                <p className="text-etiquette uppercase text-ablode-vert">
                  Nous écrire
                </p>
                <h3 className="mt-3 text-[1.375rem] font-bold leading-snug tracking-[-0.02em]">
                  Contacter l’association
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                  Une question, un partenariat, une demande de campagne dans votre commune.
                </p>
              </div>
              <span className="mt-7 text-[0.9375rem] font-semibold text-ablode-vert">
                Écrire{' '}
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          </Reveler>

          <Reveler delai={90}>
            <Link
              href="/benevole"
              className="group flex h-full flex-col justify-between rounded-carte bg-ablode-vert p-8 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-relief motion-reduce:hover:translate-y-0"
            >
              <div>
                <p className="text-etiquette uppercase text-white/70">
                  Rejoindre
                </p>
                <h3 className="mt-3 text-[1.375rem] font-bold leading-snug tracking-[-0.02em]">
                  Devenir bénévole
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/80">
                  Aucune qualification médicale n’est exigée : nous formons nos bénévoles.
                </p>
              </div>
              <span className="mt-7 text-[0.9375rem] font-semibold text-white">
                Je m’inscris{' '}
                <span
                  aria-hidden
                  className="inline-block transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </Link>
          </Reveler>

          <Reveler delai={180}>
            <div className="flex h-full flex-col justify-between rounded-carte bg-ablode-profond p-8 text-white">
              <div>
                <p className="text-etiquette uppercase text-ablode-vert-clair">
                  Nous suivre
                </p>
                <h3 className="mt-3 text-[1.375rem] font-bold leading-snug tracking-[-0.02em]">
                  Sur les réseaux
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">
                  Photos des campagnes et annonces des prochaines sorties, au jour le
                  jour.
                </p>
              </div>
              <div className="mt-7">
                <ReseauxSociaux taille={22} variante="sombre" />
              </div>
            </div>
          </Reveler>
        </div>
      </section>
    </>
  );
}
