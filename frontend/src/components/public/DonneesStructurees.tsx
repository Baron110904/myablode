import { ASSOCIATION, RESEAUX_SOCIAUX } from '@/lib/association';
import type { Article, Evenement } from '@/lib/types';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Balise JSON-LD.
 *
 * `JSON.stringify` suffit à l'échappement : le contenu vient de la base et
 * pourrait contenir un `</script>` qui refermerait la balise par surprise.
 * Les barres obliques sont donc neutralisées, ce que la sérialisation seule
 * ne fait pas.
 */
function Balise({ donnees }: { donnees: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(donnees).replace(/</g, '\\u003c'),
      }}
    />
  );
}

/**
 * Identité de l'association et du site, déclarée sur toutes les pages.
 *
 * `NGO` plutôt que `Organization` : le type précis permet aux moteurs de
 * rattacher l'entité à une association à but non lucratif, ce qui compte
 * pour une structure de santé publique.
 */
export function DonneesAssociation() {
  return (
    <>
      <Balise
        donnees={{
          '@context': 'https://schema.org',
          '@type': 'NGO',
          '@id': `${SITE}/#association`,
          name: ASSOCIATION.nom,
          alternateName: ASSOCIATION.sigle,
          url: SITE,
          logo: `${SITE}/logo.png`,
          foundingDate: String(ASSOCIATION.anneeCreation),
          description:
            'Association béninoise de lutte contre l’obésité, le diabète et les ' +
            'endocrinopathies : dépistages gratuits, sensibilisation et orientation ' +
            'vers les structures de soin.',
          address: {
            '@type': 'PostalAddress',
            streetAddress: ASSOCIATION.adresse,
            addressLocality: ASSOCIATION.ville,
            addressCountry: 'BJ',
          },
          telephone: ASSOCIATION.telephones,
          areaServed: { '@type': 'Country', name: 'Bénin' },
          sameAs: RESEAUX_SOCIAUX.map((reseau) => reseau.url),
        }}
      />
      <Balise
        donnees={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${SITE}/#site`,
          url: SITE,
          name: 'MyABLODE',
          inLanguage: 'fr',
          publisher: { '@id': `${SITE}/#association` },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${SITE}/actualites?recherche={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
    </>
  );
}

/** Programme de l'édition : chaque date devient un événement indexable. */
export function DonneesEvenements({ evenements }: { evenements: Evenement[] }) {
  if (evenements.length === 0) return null;

  return (
    <>
      {evenements.map((evenement) => (
        <Balise
          key={evenement.id}
          donnees={{
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: evenement.titre,
            startDate: evenement.date_debut,
            ...(evenement.date_fin ? { endDate: evenement.date_fin } : {}),
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            description: evenement.description ?? evenement.sous_titre ?? evenement.titre,
            location: {
              '@type': 'Place',
              name: evenement.lieu ?? 'Bénin',
              address: {
                '@type': 'PostalAddress',
                addressLocality: evenement.lieu ?? undefined,
                addressCountry: 'BJ',
              },
            },
            organizer: { '@id': `${SITE}/#association` },
            // Les dépistages de l'association sont gratuits : c'est une
            // information que les moteurs affichent directement.
            isAccessibleForFree: true,
          }}
        />
      ))}
    </>
  );
}

/** Article de presse de l'association. */
export function DonneesArticle({ article }: { article: Article }) {
  return (
    <Balise
      donnees={{
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.titre,
        description: article.extrait ?? undefined,
        image: article.image_url
          ? [
              article.image_url.startsWith('http')
                ? article.image_url
                : `${SITE}${article.image_url}`,
            ]
          : undefined,
        datePublished: article.date_publication ?? article.created_at,
        dateModified: article.date_publication ?? article.created_at,
        inLanguage: article.langue,
        author: { '@type': 'Organization', name: article.auteur ?? ASSOCIATION.sigle },
        publisher: { '@id': `${SITE}/#association` },
        mainEntityOfPage: `${SITE}/actualites/${article.slug}`,
      }}
    />
  );
}
