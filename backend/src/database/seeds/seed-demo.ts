import { DataSource } from 'typeorm';

/**
 * Jeu de données de DÉMONSTRATION (campagnes, dépistages, articles, abonnés).
 *
 * Rien ici ne provient du terrain : ces enregistrements servent à valider les
 * agrégations, la carte et les écrans avant le branchement de l'API Kobo.
 * Désactivable via SEED_DEMO_DATA=false.
 */

/** PRNG déterministe (mulberry32) : deux exécutions donnent le même jeu. */
function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMS = [
  'Sossou', 'Gbaguidi', 'Hounkpè', 'Adjovi', 'Yayi', 'Dossou', 'Boukari',
  'Tchibozo', 'Zinsou', 'Orou', 'Aïssi', 'Kpogo', 'Ahouandjinou', 'Bio',
  'Agossou', 'Djossou', 'Houngbédji', 'Sagbo', 'Tossou', 'Anagonou',
  'Amoussou', 'Dagba', 'Koudjo', 'Lokossou', 'Mensah', 'Noumonvi', 'Quenum',
  'Soglo', 'Tometin', 'Vodounou', 'Wadagni', 'Zannou', 'Assogba', 'Gnonlonfoun',
];

const PRENOMS_F = [
  'Ayaba', 'Colette', 'Fadila', 'Mariam', 'Bernadette', 'Chantal', 'Félicité',
  'Grâce', 'Honorine', 'Justine', 'Léonie', 'Marceline', 'Nadège', 'Odette',
  'Pascaline', 'Reine', 'Sylvie', 'Thérèse', 'Véronique', 'Yvette',
];

const PRENOMS_M = [
  'Rachidi', 'Séverin', 'Isidore', 'Gaston', 'Alassane', 'Basile', 'Célestin',
  'Damien', 'Émile', 'Firmin', 'Gérard', 'Hubert', 'Ignace', 'Jonas', 'Koffi',
  'Lambert', 'Moïse', 'Norbert', 'Olivier', 'Prosper',
];

const DISPONIBILITES = ['Semaine', 'Week-end', 'Ponctuelle', 'Temps plein'];

interface CommuneRow {
  id: number;
  nom: string;
  departement: string;
  centroid_lat: number | null;
  centroid_lng: number | null;
}

export interface DemoResult {
  campagnes: number;
  depistages: number;
  articles: number;
  abonnes: number;
}

export async function seedDemo(
  dataSource: DataSource,
  adminUserId: number,
): Promise<DemoResult> {
  const random = createRandom(20260828);
  const communes: CommuneRow[] = await dataSource.query(
    `SELECT id, nom, departement, centroid_lat, centroid_lng FROM communes ORDER BY id`,
  );
  if (communes.length === 0) {
    throw new Error('Aucune commune en base : lancez d’abord seedCommunes().');
  }

  const aujourdhui = new Date();
  const campagnes = await insertCampagnes(dataSource, communes, aujourdhui, random);
  const depistages = await insertDepistages(
    dataSource,
    communes,
    campagnes,
    adminUserId,
    aujourdhui,
    random,
  );
  const articles = await insertArticles(dataSource);
  const abonnes = await insertAbonnes(dataSource, random);
  await insertBenevolesEtContacts(dataSource, random);

  return {
    campagnes: campagnes.length,
    depistages,
    articles,
    abonnes,
  };
}

interface CampagneRow {
  id: number;
  commune_id: number;
  debut: Date;
  fin: Date;
}

async function insertCampagnes(
  dataSource: DataSource,
  communes: CommuneRow[],
  aujourdhui: Date,
  random: () => number,
): Promise<CampagneRow[]> {
  const responsables = [
    'K. Anagonou', 'A. Tossou', 'M. Boukari', 'S. Adjovi', 'R. Hounkpè',
  ];
  const rows: CampagneRow[] = [];

  // 26 campagnes passées réparties sur les 12 derniers mois.
  for (let i = 0; i < 26; i += 1) {
    const commune = communes[Math.floor(random() * communes.length)];
    const joursAvant = Math.floor(random() * 360) + 5;
    const debut = addDays(aujourdhui, -joursAvant);
    const fin = addDays(debut, 2 + Math.floor(random() * 3));
    const statut = fin < aujourdhui ? 'cloturee' : 'en_cours';
    const [inserted] = await dataSource.query(
      `INSERT INTO campagnes
        (commune_id, nom, date_debut, date_fin, responsable, equipe, statut, description, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now()) RETURNING id`,
      [
        commune.id,
        `Dépistage ${commune.nom} — ${moisAnnee(debut)}`,
        iso(debut),
        iso(fin),
        responsables[Math.floor(random() * responsables.length)],
        'Équipe mobile ABLODE (3 agents, 1 infirmier)',
        statut,
        `Campagne de dépistage gratuit du diabète et de l'obésité à ${commune.nom} (${commune.departement}).`,
      ],
    );
    rows.push({ id: inserted.id, commune_id: commune.id, debut, fin });
  }

  // 4 campagnes à venir, pour le widget « Prochaines campagnes ».
  for (let i = 0; i < 4; i += 1) {
    const commune = communes[Math.floor(random() * communes.length)];
    const debut = addDays(aujourdhui, 4 + i * 12);
    const fin = addDays(debut, 3);
    await dataSource.query(
      `INSERT INTO campagnes
        (commune_id, nom, date_debut, date_fin, responsable, equipe, statut, description, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'planifiee', $7, now())`,
      [
        commune.id,
        `Dépistage ${commune.nom} — ${moisAnnee(debut)}`,
        iso(debut),
        iso(fin),
        responsables[Math.floor(random() * responsables.length)],
        'Équipe mobile ABLODE',
        `Campagne planifiée à ${commune.nom}.`,
      ],
    );
  }

  return rows;
}

async function insertDepistages(
  dataSource: DataSource,
  communes: CommuneRow[],
  campagnes: CampagneRow[],
  adminUserId: number,
  aujourdhui: Date,
  random: () => number,
): Promise<number> {
  /**
   * Chaque commune reçoit une prévalence cible propre (2 % à 13 %) afin que
   * la carte choroplèthe présente un vrai dégradé plutôt qu'un aplat.
   */
  const prevalenceCible = new Map<number, number>();
  communes.forEach((commune) => {
    prevalenceCible.set(commune.id, 0.02 + random() * 0.11);
  });

  const valeurs: unknown[] = [];
  const lignes: string[] = [];
  let compteur = 0;
  let total = 0;

  const pousser = (params: unknown[]) => {
    const base = valeurs.length;
    lignes.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6},` +
        ` $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12},` +
        ` $${base + 13}, $${base + 14}, $${base + 15}, $${base + 16}, $${base + 17},` +
        ` ST_SetSRID(ST_MakePoint($${base + 18}, $${base + 19}), 4326))`,
    );
    valeurs.push(...params);
  };

  const vider = async () => {
    if (lignes.length === 0) return;
    await dataSource.query(
      `INSERT INTO depistages
        (commune_id, campagne_id, user_id, code_unique, nom, prenom, date_naissance,
         sexe, telephone, date_depistage, type, glycemie, imc, resultat,
         oriente_centre, source, verifie, localisation)
       VALUES ${lignes.join(',')}`,
      valeurs,
    );
    total += lignes.length;
    lignes.length = 0;
    valeurs.length = 0;
  };

  for (const campagne of campagnes) {
    const commune = communes.find((c) => c.id === campagne.commune_id)!;
    const prevalence = prevalenceCible.get(commune.id)!;
    const effectif = 120 + Math.floor(random() * 640);

    for (let i = 0; i < effectif; i += 1) {
      compteur += 1;
      const estFemme = random() < 0.56;
      const sexe = estFemme ? 'F' : 'M';
      const prenoms = estFemme ? PRENOMS_F : PRENOMS_M;
      const prenom = prenoms[Math.floor(random() * prenoms.length)];
      const nom = NOMS[Math.floor(random() * NOMS.length)];
      const age = 18 + Math.floor(random() * 62);
      const dateNaissance = new Date(
        aujourdhui.getFullYear() - age,
        Math.floor(random() * 12),
        1 + Math.floor(random() * 28),
      );
      const dateDepistage = addDays(
        campagne.debut,
        Math.floor(random() * 3),
      );

      // Trois quarts de dépistages « diabète », le reste obésité/endocrino.
      const tirageType = random();
      const type =
        tirageType < 0.72
          ? 'diabete'
          : tirageType < 0.94
            ? 'obesite'
            : 'endocrinopathie';

      const estPositif = random() < prevalence;
      let glycemie: number | null = null;
      let imc: number | null = null;
      let resultat: string;

      if (type === 'diabete') {
        // Seuils cliniques : < 100 normal, 100–125 pré-diabète, ≥ 126 diabète.
        if (estPositif) {
          glycemie = 126 + random() * 110;
          resultat = 'diabete';
        } else if (random() < 0.18) {
          glycemie = 100 + random() * 25;
          resultat = 'pre-diabete';
        } else {
          glycemie = 70 + random() * 29;
          resultat = 'normal';
        }
        imc = 18 + random() * 12;
      } else if (type === 'obesite') {
        if (estPositif) {
          imc = 30 + random() * 12;
          resultat = 'obesite';
        } else {
          imc = 18.5 + random() * 11;
          resultat = 'normal';
        }
        glycemie = 72 + random() * 40;
      } else {
        resultat = estPositif ? 'autre' : 'normal';
        imc = 19 + random() * 10;
      }

      const orienteCentre =
        resultat === 'diabete' || resultat === 'obesite' || resultat === 'autre';
      const source = random() < 0.62 ? 'kobo' : random() < 0.6 ? 'file' : 'manual';
      // Bruit de ±0,08° autour du centroïde : les points restent dans la commune.
      const lat = (commune.centroid_lat ?? 9.3) + (random() - 0.5) * 0.16;
      const lng = (commune.centroid_lng ?? 2.3) + (random() - 0.5) * 0.16;

      pousser([
        commune.id,
        campagne.id,
        source === 'manual' ? adminUserId : null,
        `BJ-${dateDepistage.getFullYear().toString().slice(2)}${String(
          dateDepistage.getMonth() + 1,
        ).padStart(2, '0')}-${String(compteur).padStart(5, '0')}`,
        nom,
        prenom,
        iso(dateNaissance),
        sexe,
        random() < 0.6 ? `+229 ${60 + Math.floor(random() * 40)} ${randomDigits(random, 2)} ${randomDigits(random, 2)} ${randomDigits(random, 2)}` : null,
        iso(dateDepistage),
        type,
        glycemie === null ? null : glycemie.toFixed(2),
        imc === null ? null : imc.toFixed(2),
        resultat,
        orienteCentre,
        source,
        random() < 0.7,
        lng,
        lat,
      ]);

      if (lignes.length >= 400) await vider();
    }
  }

  await vider();
  return total;
}

const ARTICLES_DEMO = [
  {
    titre: 'Sèmè-Kpodji : 842 personnes dépistées en trois jours',
    slug: 'seme-kpodji-842-personnes-depistees',
    image: '/articles/depistage-seme-kpodji.jpg',
    categorie: 'campagnes',
    extrait:
      "Trois équipes mobiles ont couvert les arrondissements d'Agblangandan, Ekpè et Tohouè. 61 cas ont été orientés vers le centre de santé.",
    contenu: `<p>Du 21 au 23 août 2026, l'ABLODE a déployé trois équipes mobiles dans la commune de Sèmè-Kpodji. En trois jours, <strong>842 personnes</strong> ont bénéficié d'un test de glycémie capillaire et d'une mesure de l'indice de masse corporelle, gratuitement.</p>
<p>Les arrondissements d'Agblangandan, d'Ekpè et de Tohouè ont été couverts successivement. Chaque poste de dépistage réunissait un agent de saisie, un infirmier et un médecin référent du centre de santé de la commune.</p>
<h3>61 personnes orientées vers une structure de soin</h3>
<p>Soixante-et-une personnes présentaient une glycémie supérieure à 126 mg/dL. Conformément au protocole de l'association, elles n'ont fait l'objet d'aucune prescription de long terme : chacune a été orientée vers le centre de santé de Sèmè-Kpodji, muni de sa fiche de dépistage, pour une prise en charge spécialisée.</p>
<p>Les données collectées via KoboCollect ont été synchronisées le soir même sur la plateforme MyABLODE et sont désormais visibles sur la carte publique.</p>`,
  },
  {
    titre: 'Le pied diabétique, première cause d’amputation évitable',
    slug: 'pied-diabetique-premiere-cause-amputation-evitable',
    image: '/articles/pied-diabetique.jpg',
    categorie: 'sensibilisation',
    extrait:
      'Retour sur la conférence animée par le service de diabétologie du CNHU, dans le cadre du projet « Le diabète et nous ».',
    contenu: `<p>Dans le cadre du projet <em>« Le diabète et nous »</em>, l'ABLODE a organisé une conférence publique consacrée au pied diabétique, animée par le service de diabétologie du Centre national hospitalier universitaire.</p>
<h3>Une complication silencieuse</h3>
<p>La neuropathie diabétique fait perdre la sensibilité du pied. Une plaie banale peut alors passer inaperçue plusieurs jours, s'infecter, et conduire à l'amputation. La quasi-totalité de ces amputations serait évitable par un examen quotidien des pieds et une consultation rapide.</p>
<h3>Les gestes à retenir</h3>
<ul>
<li>Inspecter ses pieds chaque jour, y compris entre les orteils ;</li>
<li>Ne jamais marcher pieds nus, même à la maison ;</li>
<li>Consulter dès l'apparition d'une plaie, d'une rougeur ou d'un durillon ;</li>
<li>Contrôler sa glycémie régulièrement.</li>
</ul>`,
  },
  {
    titre: 'Marche « Sucre à terre » : 5 km contre la sédentarité',
    slug: 'marche-sucre-a-terre-5-km-contre-la-sedentarite',
    image: '/articles/marche-sucre-a-terre-3.jpg',
    categorie: 'evenements',
    extrait:
      "Plus de 400 marcheurs au départ du stade de l'Amitié. Bilans de glycémie gratuits proposés à l'arrivée.",
    contenu: `<p>La marche <strong>« Sucre à terre »</strong> a rassemblé plus de 400 participants au départ du stade de l'Amitié. Sur cinq kilomètres, l'événement rappelle qu'une activité physique régulière reste le premier levier de prévention du diabète de type 2.</p>
<p>À l'arrivée, un village santé accueillait les marcheurs : mesure gratuite de la glycémie et de l'IMC, conseils nutritionnels adaptés aux habitudes alimentaires locales, et orientation vers les centres de santé partenaires pour les résultats anormaux.</p>
<p>L'édition suivante est prévue pour le premier trimestre 2027.</p>`,
  },
  {
    titre: 'Résultats semestriels : 12 communes au-dessus du seuil d’alerte',
    slug: 'resultats-semestriels-12-communes-seuil-alerte',
    image: '/articles/alerte-communes.jpg',
    categorie: 'resultats',
    extrait:
      'La consolidation des campagnes du premier semestre fait ressortir douze communes dont le taux de prévalence dépasse 11 %.',
    contenu: `<p>La consolidation des données de dépistage du premier semestre est désormais disponible sur la plateforme. Elle fait ressortir <strong>douze communes</strong> dont le taux de prévalence dépasse le seuil d'alerte fixé à 11 % par le comité scientifique de l'association.</p>
<p>Ces territoires feront l'objet d'une campagne de rappel au dernier trimestre, en lien avec les centres de santé de zone. La méthodologie reste celle du dépistage opportuniste : les taux publiés reflètent la population <em>dépistée</em>, et non la population générale.</p>
<p>Le détail commune par commune est consultable sur la page Résultats et sur la carte interactive.</p>`,
  },
  {
    titre: 'Comment lire une glycémie à jeun ?',
    slug: 'comment-lire-une-glycemie-a-jeun',
    image: '/articles/glycemie.jpg',
    categorie: 'sensibilisation',
    extrait:
      'Normal, pré-diabète, diabète : trois seuils simples pour comprendre le résultat remis lors du dépistage.',
    contenu: `<p>Le test réalisé lors des campagnes de l'ABLODE mesure la glycémie capillaire à jeun, exprimée en milligrammes par décilitre (mg/dL).</p>
<h3>Trois zones</h3>
<ul>
<li><strong>Moins de 100 mg/dL</strong> — valeur normale ;</li>
<li><strong>100 à 125 mg/dL</strong> — pré-diabète : le risque est réel mais réversible par l'alimentation et l'activité physique ;</li>
<li><strong>126 mg/dL ou plus</strong> — évocateur de diabète, à confirmer par un second test en laboratoire.</li>
</ul>
<p>Un résultat élevé lors d'un dépistage ne pose jamais le diagnostic à lui seul. C'est le médecin du centre de santé vers lequel vous êtes orienté qui le confirmera.</p>`,
  },
  {
    titre: 'Campagne de Parakou : bilan et enseignements',
    slug: 'campagne-parakou-bilan-et-enseignements',
    image: '/articles/campagne-parakou.jpg',
    categorie: 'campagnes',
    extrait:
      'Retour sur une semaine de dépistage dans le Borgou, et sur ce que la collecte numérique a changé pour les équipes.',
    contenu: `<p>La campagne menée à Parakou marque une étape : c'est la première opération entièrement saisie sur KoboCollect, sans fiche papier de secours.</p>
<h3>Ce que la collecte numérique change</h3>
<p>Les données remontent le soir même sur la plateforme. Le coordinateur voit la répartition par arrondissement dès le lendemain matin et peut redéployer une équipe vers un quartier sous-couvert, au lieu d'attendre la saisie a posteriori.</p>
<p>Reste un point de vigilance : la couverture réseau. Les formulaires sont remplis hors ligne puis synchronisés au retour, ce qui décale parfois l'horodatage réel du dépistage.</p>`,
  },
];

async function insertArticles(dataSource: DataSource): Promise<number> {
  const aujourdhui = new Date();
  let count = 0;
  for (const [index, article] of ARTICLES_DEMO.entries()) {
    const datePublication = addDays(aujourdhui, -(5 + index * 9));
    await dataSource.query(
      `INSERT INTO articles
        (titre, slug, extrait, contenu, categorie, image_url, auteur, langue,
         statut, date_publication, meta_title, meta_description, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'fr', 'published', $8, $1, $3, now())
       ON CONFLICT (slug) DO UPDATE SET image_url = EXCLUDED.image_url`,
      [
        article.titre,
        article.slug,
        article.extrait,
        article.contenu,
        article.categorie,
        article.image,
        'Équipe ABLODE',
        datePublication,
      ],
    );
    count += 1;
  }
  return count;
}

async function insertAbonnes(
  dataSource: DataSource,
  random: () => number,
): Promise<number> {
  let count = 0;
  for (let i = 0; i < 48; i += 1) {
    const email = `abonne${i + 1}@example.bj`;
    await dataSource.query(
      `INSERT INTO newsletter (email, token, active)
       VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
      [email, randomToken(random), random() > 0.08],
    );
    count += 1;
  }
  return count;
}

async function insertBenevolesEtContacts(
  dataSource: DataSource,
  random: () => number,
): Promise<void> {
  const villes = ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon'];
  for (let i = 0; i < 9; i += 1) {
    const estFemme = random() < 0.5;
    const prenoms = estFemme ? PRENOMS_F : PRENOMS_M;
    await dataSource.query(
      `INSERT INTO benevoles (nom, prenom, email, telephone, ville, disponibilite, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        NOMS[Math.floor(random() * NOMS.length)],
        prenoms[Math.floor(random() * prenoms.length)],
        `benevole${i + 1}@example.bj`,
        `+229 9${randomDigits(random, 1)} ${randomDigits(random, 2)} ${randomDigits(random, 2)} ${randomDigits(random, 2)}`,
        villes[Math.floor(random() * villes.length)],
        DISPONIBILITES[Math.floor(random() * DISPONIBILITES.length)],
        "Je souhaite participer aux campagnes de dépistage près de chez moi.",
      ],
    );
  }

  const messages = [
    'Bonjour, notre centre de santé souhaite accueillir une campagne de dépistage.',
    'Pouvez-vous préciser les dates de la prochaine marche « Sucre à terre » ?',
    "Je représente une entreprise qui aimerait soutenir l'association.",
  ];
  for (const [i, message] of messages.entries()) {
    await dataSource.query(
      `INSERT INTO contacts (nom, email, sujet, message) VALUES ($1, $2, $3, $4)`,
      [
        `${PRENOMS_M[i]} ${NOMS[i]}`,
        `contact${i + 1}@example.bj`,
        'Demande d’information',
        message,
      ],
    );
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function moisAnnee(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function randomDigits(random: () => number, length: number): string {
  return String(Math.floor(random() * 10 ** length)).padStart(length, '0');
}

function randomToken(random: () => number): string {
  const alphabet = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 48; i += 1) {
    token += alphabet[Math.floor(random() * alphabet.length)];
  }
  return token;
}
