/** Types du contrat d'API, alignés sur les DTO NestJS. */

export type Role = 'super_admin' | 'admin' | 'viewer';
export type Sexe = 'M' | 'F';
export type TypeDepistage = 'diabete' | 'obesite' | 'endocrinopathie';
export type ResultatDepistage =
  | 'normal'
  | 'pre-diabete'
  | 'diabete'
  | 'obesite'
  | 'autre'
  /** Mesure hors des bornes physiologiques : aucun résultat n'en est tiré. */
  | 'a_verifier';
export type SourceDepistage = 'kobo' | 'file' | 'manual';
export type StatutCampagne = 'planifiee' | 'en_cours' | 'cloturee';
export type CategorieArticle =
  | 'campagnes'
  | 'sensibilisation'
  | 'resultats'
  | 'evenements';
export type StatutArticle = 'draft' | 'published' | 'archived';
export type Periode = '7j' | '30j' | 'annee' | 'tout' | 'perso';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Utilisateur {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: Role;
  active: boolean;
  twofa_enabled: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Commune {
  id: number;
  nom: string;
  code: string | null;
  departement: string | null;
}

export interface StatCommune extends Commune {
  centroid_lat: number | null;
  centroid_lng: number | null;
  depistages: number;
  cas: number;
  diabete: number;
  obesite: number;
  taux: number;
  derniere_campagne: string | null;
}

export interface ResumeStats {
  totalDepistages: number;
  casDetectes: number;
  preDiabete: number;
  orientesCentre: number;
  communesCouvertes: number;
  totalCommunes: number;
  campagnesRealisees: number;
  tauxPrevalence: number;
  variationDepistages7j: number;
  variationCas7j: number;
}

export interface PointEvolution {
  periode: string;
  depistages: number;
  cas: number;
}

export interface RepartitionAgeSexe {
  tranche: string;
  hommes: number;
  femmes: number;
}

export interface Campagne {
  id: number;
  commune_id: number | null;
  commune?: Commune | null;
  nom: string;
  date_debut: string;
  date_fin: string | null;
  responsable: string | null;
  equipe: string | null;
  statut: StatutCampagne;
  description: string | null;
  photo_url: string | null;
  archivee: boolean;
  created_at: string;
}

export interface Depistage {
  id: number;
  commune_id: number | null;
  commune?: Commune | null;
  campagne_id: number | null;
  campagne?: Campagne | null;
  code_unique: string | null;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: Sexe;
  telephone: string | null;
  date_depistage: string;
  type: TypeDepistage;
  glycemie: string | null;
  imc: string | null;
  /** Poids en kilogrammes ; l'IMC en est déduit. */
  poids: string | null;
  /** Taille en centimètres. */
  taille: string | null;
  resultat: ResultatDepistage;
  oriente_centre: boolean;
  notes: string | null;
  source: SourceDepistage;
  verifie: boolean;
  /** Mesure sortant des bornes physiologiques : à reprendre, pas refusée. */
  hors_norme: boolean;
  motif_hors_norme: string | null;
  created_at: string;
}

export interface Article {
  id: number;
  titre: string;
  slug: string;
  extrait: string | null;
  contenu: string;
  image_url: string | null;
  categorie: CategorieArticle;
  auteur: string | null;
  langue: string;
  statut: StatutArticle;
  date_publication: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user?: Pick<Utilisateur, 'id' | 'nom' | 'prenom' | 'email'> | null;
  action: string;
  entity: string;
  entity_id: number | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface TableauDeBord {
  resume: ResumeStats;
  evolution: PointEvolution[];
  alertes: StatCommune[];
  activite: AuditLog[];
  prochaines: Campagne[];
}

export interface KoboConfig {
  id: number;
  api_url: string;
  form_id: string | null;
  sync_interval: number;
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: 'jamais' | 'succes' | 'erreur' | 'en_cours';
  last_sync_message: string | null;
  last_sync_count: number;
  field_mapping: Record<string, string> | null;
  token_configure: boolean;
}

export interface KoboSyncLog {
  id: number;
  statut: 'succes' | 'erreur';
  declencheur: 'manuel' | 'cron';
  nb_recus: number;
  nb_importes: number;
  nb_doublons: number;
  nb_erreurs: number;
  duree_ms: number | null;
  message: string | null;
  details: { erreurs?: Array<{ koboId: string; raison: string }> } | null;
  created_at: string;
}

export interface ResultatTestKobo {
  ok: boolean;
  message: string;
  formulaire?: { uid: string; nom: string; soumissions: number };
  formulairesDisponibles?: Array<{ uid: string; nom: string; soumissions: number }>;
  champs?: string[];
  /** Correspondance devinée par le serveur d'après les noms de champs. */
  mappingSuggere?: Record<string, string>;
}

export interface ResultatSync {
  statut: 'succes' | 'erreur';
  recus: number;
  importes: number;
  doublons: number;
  erreurs: number;
  dureeMs: number;
  message: string;
  echantillonErreurs: Array<{ koboId: string; raison: string }>;
}

export interface ApercuFichier {
  nomFichier: string;
  colonnes: string[];
  lignes: Array<Record<string, string>>;
  totalLignes: number;
  mappingSuggere: Record<string, string>;
}

export interface RapportImport {
  totalLignes: number;
  importees: number;
  ignorees: number;
  erreurs: number;
  detailErreurs: Array<{ ligne: number; raison: string }>;
  message: string;
}

/** Message envoyé par la plateforme, tel que réglable depuis Paramètres. */
export interface GabaritMail {
  cle: string;
  libelle: string;
  description: string;
  variables: Array<{ nom: string; role: string }>;
  /** Ce qui partira réellement : le réglage, ou le texte d'origine. */
  sujet: string;
  corps: string;
  sujetOrigine: string;
  corpsOrigine: string;
  personnalise: boolean;
}

export interface Setting {
  key: string;
  value: unknown;
  groupe: string;
  description: string | null;
  updated_at: string | null;
}

export interface AbonneNewsletter {
  id: number;
  email: string;
  active: boolean;
  created_at: string;
}

export interface EnvoiNewsletter {
  id: number;
  article_id: number | null;
  article?: Article | null;
  sujet: string;
  statut: 'envoye' | 'echec' | 'planifie';
  nb_destinataires: number;
  nb_ouvertures: number;
  nb_clics: number;
  date_envoi: string | null;
  created_at: string;
}

export interface MessageContact {
  id: number;
  nom: string;
  email: string;
  sujet: string | null;
  message: string;
  traite: boolean;
  created_at: string;
}

export type StatutCandidature = 'en_attente' | 'accepte' | 'refuse';

/** Formulaire d'inscription à la marche, tel que le site public le reçoit. */
export interface FormulaireMarchePublic {
  id: number;
  titre: string;
  introduction: string | null;
  dateFermeture: string | null;
  messageFerme: string | null;
  /** Faux dès que la date de clôture est passée. */
  ouvert: boolean;
  inscrits: number;
}

/** Réglages du formulaire, côté back-office. */
export interface FormulaireMarche {
  id: number;
  article_id: number;
  titre: string;
  introduction: string | null;
  date_fermeture: string | null;
  message_ferme: string | null;
  publie: boolean;
  created_at: string;
}

export interface InscriptionMarche {
  id: number;
  formulaire_id: number;
  formulaire?: { id: number; titre: string } | null;
  nom: string;
  prenom: string;
  age: number;
  sexe: Sexe;
  fonction: string;
  ville: string;
  quartier: string;
  /** Nul sur les inscriptions antérieures à l'ajout du champ. */
  email: string | null;
  telephone: string | null;
  deja_participe: boolean;
  motivation: string | null;
  traite: boolean;
  created_at: string;
}

export interface StatsInscriptions {
  total: number;
  hommes: number;
  femmes: number;
  ancienParticipants: number;
  ageMoyen: number | null;
}

export interface Benevole {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  ville: string | null;
  disponibilite: string | null;
  message: string | null;
  statut: StatutCandidature;
  /** Réponse déjà adressée au candidat, conservée comme trace. */
  reponse: string | null;
  repondu_le: string | null;
  /** Fiche agent créée à l'acceptation. */
  agent_id: number | null;
  /** Compte de consultation créé à l'acceptation. */
  user_id: number | null;
  /** Calculé en base : statut différent de « en attente ». */
  traite: boolean;
  created_at: string;
}

/** GeoJSON de la carte choroplèthe, tel que produit par PostGIS. */
/** Découpage territorial affiché par la carte. */
export type NiveauCarte = 'commune' | 'departement';

export interface CarteGeoJson {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: number;
    geometry: { type: string; coordinates: unknown };
    properties: {
      id: number;
      nom: string;
      departement: string | null;
      code: string | null;
      /** « commune » ou « departement » : le découpage servi. */
      niveau: NiveauCarte;
      /** Projection de population 2024 ; null si non renseignée. */
      population: number | null;
      /** Dépistés pour 1 000 habitants ; null sans population. */
      couverture: number | null;
      depistages: number;
      cas: number;
      diabete: number;
      obesite: number;
      taux: number;
      derniere_campagne: string | null;
    };
  }>;
}

export type RoleTerrain = 'agent' | 'infirmier' | 'superviseur' | 'benevole';

export interface AgentAffectation {
  id: number;
  agent_id: number;
  campagne_id: number | null;
  campagne?: Campagne | null;
  commune_id: number | null;
  commune?: Commune | null;
  date_debut: string | null;
  date_fin: string | null;
  created_at: string;
}

export interface Agent {
  id: number;
  nom: string;
  prenom: string;
  /** Matricule saisi dans le formulaire Kobo : la clé de rattachement. */
  code_kobo: string | null;
  telephone: string | null;
  email: string | null;
  role_terrain: RoleTerrain;
  actif: boolean;
  notes: string | null;
  affectations: AgentAffectation[];
  created_at: string;
}

export interface StatsAgent {
  depistages: number;
  cas: number;
  communes: number;
  dernierDepistage: string | null;
  /** Collecte des campagnes et communes auxquelles l'agent est affecté. */
  equipe: { depistages: number; cas: number; communes: number };
}

export type TypeMessageAgent = 'eloge' | 'rappel';

/** Éloge ou rappel adressé à un agent ou à une équipe communale. */
export interface MessageAgent {
  id: number;
  agent_id: number | null;
  agent?: Pick<Agent, 'id' | 'nom' | 'prenom'> | null;
  commune_id: number | null;
  commune?: Commune | null;
  message: string;
  type: TypeMessageAgent;
  auteur?: Pick<Utilisateur, 'id' | 'nom' | 'prenom'> | null;
  created_at: string;
}

/** Suivi en direct du flux entrant (back-office). */
export type FenetreDirect = '30s' | '5min' | '1h' | '24h' | '7j';

export interface PointDirect {
  borne: string;
  depistages: number;
  cas: number;
  communes: number;
}

export interface LigneDirect {
  commune_id: number;
  nom: string;
  depistages: number;
  cas: number;
  taux: number;
  /** Dépistages arrivés sur la fenêtre courante ; 0 si la commune est au repos. */
  arrivees: number;
}

export interface SuiviDirect {
  fenetre: FenetreDirect;
  horodatage: string;
  serie: PointDirect[];
  surFenetre: number;
  casFenetre: number;
  tauxFenetre: number;
  /** Communes distinctes touchées sur la fenêtre. */
  communesFenetre: number;
  cumulJour: number;
  casJour: number;
  communesJour: number;
  totalCommunes: number;
  classement: LigneDirect[];
  dernierSignal: { commune: string; horodatage: string } | null;
}

/** Un dépistage tel que le flux entrant l'expose. */
export interface ArriveeDepistage {
  id: number;
  commune: string;
  commune_id: number;
  lat: number | null;
  lng: number | null;
  horodatage: string;
  /** Réservé au flux interne : le flux public ne renvoie pas ces champs. */
  resultat?: ResultatDepistage;
  glycemie?: number | null;
}

export interface FiltresCarte {
  periode: Periode;
  dateDebut?: string;
  dateFin?: string;
  type?: TypeDepistage;
  sexe?: Sexe;
  ageMin?: number;
  ageMax?: number;
  communeId?: number;
}
