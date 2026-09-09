import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales et protection des données',
  description:
    'Éditeur du site, hébergement, traitement des données de dépistage et ' +
    'droits des personnes.',
};

/**
 * Les sections ci-dessous couvrent les obligations décrites en section 6.2
 * des spécifications. Les mentions marquées « à compléter » attendent les
 * informations juridiques de l'association.
 */
export default function PageMentionsLegales() {
  return (
    <div className="conteneur py-12">
      <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.02em]">
        Mentions légales et protection des données
      </h1>

      <div className="article-contenu mt-10 max-w-lecture">
        <h2>Éditeur du site</h2>
        <p>
          MyABLODE est édité par l’ABLODE — Association Béninoise de Lutte contre
          l’Obésité, le Diabète et les Endocrinopathies, association à but non lucratif
          dont le siège est à Abomey-Calavi, Bénin.
        </p>
        <p className="text-ablode-gris">
          <em>
            Numéro d’enregistrement de l’association, directeur de publication et
            coordonnées complètes : à compléter par l’association.
          </em>
        </p>

        <h2>Données de dépistage</h2>
        <p>
          Les campagnes de dépistage collectent des <strong>données de santé
          nominatives</strong> : identité, date de naissance, commune, mesures cliniques
          (glycémie, indice de masse corporelle) et orientation éventuelle vers une
          structure de soin.
        </p>
        <p>Ces données font l’objet des garanties suivantes :</p>
        <ul>
          <li>
            <strong>Aucune diffusion publique nominative.</strong> Le site ne publie que
            des agrégats par commune. Les pages publiques ne donnent jamais accès à une
            fiche individuelle.
          </li>
          <li>
            <strong>Accès restreint.</strong> Seuls les comptes Admin et Super Admin
            accèdent aux données nominatives. Les comptes en lecture seule (Viewer)
            obtiennent des exports anonymisés, dépourvus de nom, prénom, téléphone et date
            de naissance.
          </li>
          <li>
            <strong>Traçabilité.</strong> Chaque consultation sensible, modification,
            import et export est enregistrée dans un journal d’audit non modifiable.
          </li>
          <li>
            <strong>Consentement.</strong> Le recueil du consentement des personnes
            dépistées, sur le terrain, est un prérequis à toute saisie dans la plateforme.
          </li>
        </ul>

        <h2>Finalité du traitement</h2>
        <p>
          Les données servent au suivi épidémiologique des maladies non transmissibles, au
          pilotage des campagnes de l’association et à l’orientation des personnes
          dépistées vers une prise en charge médicale. Elles ne sont ni revendues, ni
          utilisées à des fins publicitaires.
        </p>

        <h2>Droits des personnes</h2>
        <p>
          Toute personne dépistée peut demander l’accès à ses données, leur rectification
          ou leur suppression, en écrivant à l’association via la page Contact ou lors
          d’une campagne. La demande est traitée par un administrateur habilité et
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
          </a>{' '}
          et CARTO.
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
  );
}
