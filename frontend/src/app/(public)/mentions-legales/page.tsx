import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/mentions-legales' },
  openGraph: { url: '/mentions-legales' },
  title: 'Mentions légales et protection des données',
  description:
    'Éditeur du site, hébergement, traitement des données de dépistage et ' +
    'droits des personnes.',
};

/**
 * Les sections ci-dessous couvrent les obligations décrites en section 6.2
 * des spécifications.
 *
 * Le numéro d'enregistrement et le directeur de publication n'y figurent pas :
 * ils ne nous ont pas été communiqués, et une page juridique qui annonce
 * elle-même qu'elle est incomplète vaut moins que son silence. Ils se posent
 * dans la section « Éditeur du site » le jour où l'association les donne.
 */
export default function PageMentionsLegales() {
  return (
    <>
      <section className="bg-ablode-profond text-white">
        <div className="conteneur py-14">
          <p className="text-etiquette uppercase text-ablode-vert-clair">
            Informations légales
          </p>
          <h1 className="mt-4 text-[2.25rem] font-bold leading-tight tracking-[-0.02em] sm:text-[2.75rem]">
            Mentions légales et protection des données
          </h1>
        </div>
      </section>

      <div className="conteneur py-12">
        <div className="article-contenu max-w-lecture">
        <h2>Éditeur du site</h2>
        <p>
          MyABLODE est édité par l’ABLODE - Association Béninoise de Lutte contre
          l’Obésité, le Diabète et les Endocrinopathies, association à but non lucratif
          dont le siège est à Abomey-Calavi, Bénin.
        </p>

        <h2>Données de dépistage</h2>
        <p>
          L’association n’est pas autorisée à ce jour à recueillir des informations
          permettant d’identifier les personnes rencontrées pendant les campagnes.
          Elle n’en recueille donc pas.
        </p>
        <p>
          Ce que la plateforme enregistre, ce sont les mesures relevées au moment du
          dépistage: le type d’examen (diabète, obésité, endocrinopathie), la
          glycémie, le poids, la taille et l’indice de masse corporelle qui s’en
          déduit, le résultat et l’orientation éventuelle vers une structure de soin.
          S’y ajoutent la commune et la date, qui seules permettent les cartes et les
          courbes publiées ici.
        </p>
        <p>
          Le site n’affiche que des totaux par commune. Aucune page ne donne accès au
          dépistage d’une personne en particulier.
        </p>

        <h2>Informations que vous nous transmettez</h2>
        <p>
          Quatre formulaires recueillent des informations, et uniquement si vous
          choisissez de les remplir:
        </p>
        <ul>
          <li>
            <strong>Contact.</strong> Nom, adresse email et message, pour pouvoir vous
            répondre.
          </li>
          <li>
            <strong>Candidature de bénévole.</strong> Nom, prénom, adresse email,
            téléphone, ville et disponibilités, pour composer les équipes de terrain.
          </li>
          <li>
            <strong>Inscription à une marche.</strong> Nom, prénom, âge, sexe, ville et
            coordonnées, pour établir la liste des participants.
          </li>
          <li>
            <strong>Lettre d’information.</strong> La seule adresse email.
          </li>
        </ul>
        <p>
          Ces informations ne sont lues que par l’association. Elles ne sont jamais
          publiées sur le site, ni revendues, ni transmises à des tiers.
        </p>

        <h2>Finalité du traitement</h2>
        <p>
          Les mesures de dépistage servent au suivi épidémiologique des maladies non
          transmissibles et au pilotage des campagnes de l’association. Elles ne sont
          ni revendues, ni utilisées à des fins publicitaires.
        </p>

        <h2>Droits des personnes</h2>
        <p>
          Vous pouvez demander l’accès aux informations que vous nous avez transmises,
          leur rectification ou leur suppression, en écrivant à l’association via la
          page Contact. La demande est traitée par un administrateur habilité et
          consignée au journal d’audit.
        </p>

        <h2>Newsletter</h2>
        <p>
          L’inscription à la lettre d’information est facultative et repose sur la seule
          adresse email. Chaque envoi contient un lien de désinscription en un clic.
        </p>

        <h2>Cookies</h2>
        <p>
          La consultation du site public ne dépose aucun cookie. Un unique cookie de
          session est créé lors de la connexion d’un administrateur à l’espace de
          gestion, et supprimé à sa déconnexion.
        </p>
        <p>Aucun cookie publicitaire ni traceur tiers n’est déposé.</p>

        <h2>Langue d’affichage</h2>
        <p>
          Le site s’affiche en français ou en anglais selon la langue configurée dans
          votre navigateur. Aucune préférence n’est enregistrée de notre côté.
        </p>

        <h2>Sources cartographiques</h2>
        <p>
          Les contours des 77 communes proviennent de{' '}
          <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener noreferrer">
            geoBoundaries
          </a>{' '}
          (données ouvertes). Le fond de carte est fourni par{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            OpenStreetMap
          </a>
          .
        </p>

        <h2>Limites d’interprétation</h2>
        <p>
          Les taux de prévalence publiés portent sur la <strong>population
          dépistée</strong> lors des campagnes, et non sur la population générale des
          communes. Le dépistage étant opportuniste, ces taux ne constituent pas une
          estimation épidémiologique de la prévalence réelle du diabète ou de l’obésité au
          Bénin.
        </p>
        </div>
      </div>
    </>
  );
}
