import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChiffresCles } from '@/components/public/ChiffresCles';
import { ReseauxSociaux } from '@/components/public/ReseauxSociaux';
import { Reveler } from '@/components/public/Reveler';
import { apiPublicOuDefaut } from '@/lib/api';
import { PARTENAIRES } from '@/lib/association';
import type { ResumeStats } from '@/lib/types';

export const metadata: Metadata = {
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
      <section className="bg-ablode-encre text-white">
        <div className="conteneur grid gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
          <Reveler>
            <p className="font-mono text-etiquette uppercase text-ablode-vert-clair">
              Association à but non lucratif · depuis 2018
            </p>
            <h1 className="mt-5 text-[2.5rem] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[3rem]">
              Réduire le nombre de malades du diabète au Bénin
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

        <div className="border-t border-white/10">
          <div className="conteneur grid grid-cols-2 gap-x-8 gap-y-8 py-10 sm:grid-cols-4">
            {[
              { valeur: '2018', libelle: 'Année de création' },
              { valeur: '77', libelle: 'Communes du Bénin' },
              { valeur: '5 km', libelle: 'Marche « Sucre à terre »' },
              { valeur: '3', libelle: 'Objectifs statutaires' },
            ].map((carte) => (
              <div key={carte.libelle}>
                <p className="text-[2rem] font-bold leading-none tracking-[-0.02em]">
                  {carte.valeur}
                </p>
                <p className="mt-2 font-mono text-etiquette uppercase text-white/50">
                  {carte.libelle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Objectifs, en vert pâle ──────────────────────────────────── */}
      <section className="bg-ablode-voile">
        <div className="conteneur py-16">
          <Reveler>
            <p className="font-mono text-etiquette uppercase text-ablode-vert">
              Notre raison d’être
            </p>
            <h2 className="mt-4 titre-section max-w-2xl">{t('mission')}</h2>
          </Reveler>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {OBJECTIFS.map((objectif, index) => (
              <Reveler key={objectif.numero} delai={index * 100}>
                <div className="group h-full border-t-2 border-ablode-vert bg-white p-7 transition-transform duration-300 hover:-translate-y-1 motion-reduce:hover:translate-y-0">
                  <p className="font-mono text-[2rem] font-bold leading-none text-ablode-voile transition-colors duration-300 group-hover:text-ablode-vert-clair">
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

      {/* ─── Activités, cartes contrastées ────────────────────────────── */}
      <section className="conteneur py-16">
        <Reveler>
          <h2 className="titre-section">{t('activites')}</h2>
        </Reveler>

        <div className="mt-10 space-y-5">
          {ACTIVITES.map((activite, index) => {
            const styles = {
              vert: 'bg-ablode-vert text-white',
              encre: 'bg-ablode-encre text-white',
              clair: 'border border-ablode-trait bg-white text-ablode-encre',
            }[activite.accent];

            const secondaire =
              activite.accent === 'clair' ? 'text-ablode-gris' : 'text-white/70';
            const surtitre =
              activite.accent === 'clair' ? 'text-ablode-vert' : 'text-white/60';

            return (
              <Reveler key={activite.titre} delai={index * 90}>
                <article
                  className={`grid gap-6 p-9 transition-shadow duration-300 hover:shadow-lg sm:grid-cols-[1fr_1.5fr] sm:gap-12 sm:p-11 ${styles}`}
                >
                  <div>
                    <p className={`font-mono text-etiquette uppercase ${surtitre}`}>
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
            <p className="font-mono text-etiquette uppercase text-ablode-vert">
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
                <p className="font-mono text-etiquette uppercase text-ablode-vert">
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
      <section className="bg-ablode-voile">
        <div className="conteneur py-16">
          <Reveler>
            <h2 className="titre-section">{t('partenaires')}</h2>
            <p className="mt-4 max-w-lecture text-[0.9375rem] leading-relaxed text-ablode-gris">
              Centres de santé publics, hôpitaux de zone, cliniques partenaires et
              services hospitaliers de diabétologie accompagnent les campagnes sur le
              terrain.
            </p>
          </Reveler>

          <ul className="mt-10 grid grid-cols-2 gap-px bg-ablode-trait sm:grid-cols-4">
            {PARTENAIRES.map((partenaire, index) => (
              <Reveler as="li" key={partenaire.nom} delai={index * 70}>
                <div className="group flex h-full min-h-[180px] flex-col items-center justify-center gap-4 bg-white p-6 text-center transition-colors duration-300 hover:bg-ablode-voile">
                  {/*
                    Les logos ont des formats et des fonds très différents :
                    `object-contain` dans une boîte de hauteur fixe les aligne
                    optiquement sans les déformer.
                  */}
                  <div className="flex h-[70px] w-full items-center justify-center">
                    <Image
                      src={partenaire.logo}
                      alt={partenaire.nom}
                      width={150}
                      height={70}
                      className="max-h-[70px] w-auto object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                  </div>
                  <span className="font-mono text-[0.6875rem] uppercase leading-relaxed tracking-[0.08em] text-ablode-gris">
                    {partenaire.role}
                  </span>
                </div>
              </Reveler>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Appels à l'action ────────────────────────────────────────── */}
      <section className="conteneur py-16">
        <div className="grid gap-px bg-ablode-trait sm:grid-cols-3">
          <Reveler>
            <Link
              href="/contact"
              className="group flex h-full flex-col justify-between bg-white p-9 transition-colors hover:bg-ablode-voile"
            >
              <div>
                <p className="font-mono text-etiquette uppercase text-ablode-vert">
                  Nous écrire
                </p>
                <h3 className="mt-3 text-xl font-bold leading-snug">
                  Contacter l’association
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                  Une question, un partenariat, une demande de campagne dans votre commune.
                </p>
              </div>
              <span
                aria-hidden
                className="mt-8 inline-block text-ablode-vert transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveler>

          <Reveler delai={90}>
            <Link
              href="/benevole"
              className="group flex h-full flex-col justify-between bg-white p-9 transition-colors hover:bg-ablode-voile"
            >
              <div>
                <p className="font-mono text-etiquette uppercase text-ablode-vert">
                  Rejoindre
                </p>
                <h3 className="mt-3 text-xl font-bold leading-snug">Devenir bénévole</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                  Aucune qualification médicale n’est exigée : nous formons nos bénévoles.
                </p>
              </div>
              <span
                aria-hidden
                className="mt-8 inline-block text-ablode-vert transition-transform duration-200 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveler>

          <Reveler delai={180}>
            <div className="flex h-full flex-col justify-between bg-white p-9">
              <div>
                <p className="font-mono text-etiquette uppercase text-ablode-vert">
                  Nous suivre
                </p>
                <h3 className="mt-3 text-xl font-bold leading-snug">Sur les réseaux</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ablode-gris">
                  Photos des campagnes, annonces des prochaines sorties et actualités de
                  l’association au jour le jour.
                </p>
              </div>
              <div className="mt-8">
                <ReseauxSociaux taille={24} avecLibelles />
              </div>
            </div>
          </Reveler>
        </div>
      </section>
    </>
  );
}
