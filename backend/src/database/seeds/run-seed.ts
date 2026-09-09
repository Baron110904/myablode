import * as bcrypt from 'bcryptjs';
import dataSource from '../data-source';
import { seedCommunes } from './seed-communes';
import { seedDepartements } from './seed-departements';
import { seedDemo } from './seed-demo';

/** Paramètres système par défaut (section 3.2.7 des spécifications). */
const SETTINGS_DEFAUT: Array<{
  key: string;
  value: unknown;
  groupe: string;
  description: string;
}> = [
  {
    key: 'seuil_glycemie_normale',
    value: 100,
    groupe: 'seuils',
    description: 'Glycémie à jeun en dessous de laquelle le résultat est normal (mg/dL)',
  },
  {
    key: 'seuil_glycemie_diabete',
    value: 126,
    groupe: 'seuils',
    description: 'Glycémie à jeun à partir de laquelle le diabète est évoqué (mg/dL)',
  },
  {
    key: 'seuil_imc_surpoids',
    value: 25,
    groupe: 'seuils',
    description: 'IMC à partir duquel on parle de surpoids',
  },
  {
    key: 'seuil_imc_obesite',
    value: 30,
    groupe: 'seuils',
    description: 'IMC à partir duquel on parle d’obésité',
  },
  {
    key: 'seuil_alerte_prevalence',
    value: 10,
    groupe: 'seuils',
    description: 'Taux de prévalence (%) déclenchant une alerte sur le tableau de bord',
  },
  {
    key: 'langues_actives',
    value: ['fr', 'en'],
    groupe: 'langues',
    description: 'Langues proposées dans le sélecteur du site public',
  },
  {
    key: 'langue_defaut',
    value: 'fr',
    groupe: 'langues',
    description: 'Langue par défaut du site',
  },
  {
    key: 'newsletter_signature',
    value: 'ABLODE — Association Béninoise de Lutte contre l’Obésité, le Diabète et les Endocrinopathies · Abomey-Calavi, Bénin',
    groupe: 'newsletter',
    description: 'Signature ajoutée en bas de chaque envoi',
  },
  {
    key: 'securite_2fa',
    value: 'optionnel',
    groupe: 'securite',
    description: 'Politique de double authentification : optionnel ou obligatoire',
  },
  {
    key: 'securite_duree_session',
    value: 15,
    groupe: 'securite',
    description: 'Durée de validité du jeton d’accès, en minutes',
  },
];

async function main(): Promise<void> {
  await dataSource.initialize();
  console.log('→ Connexion à la base établie.');

  try {
    const [{ count: nbCommunes }] = await dataSource.query(
      `SELECT COUNT(*)::int AS count FROM communes`,
    );
    if (nbCommunes === 0) {
      const inserted = await seedCommunes(dataSource);
      console.log(`✓ ${inserted} communes du Bénin chargées dans PostGIS.`);
    } else {
      console.log(`· ${nbCommunes} communes déjà présentes, chargement ignoré.`);
    }

    /*
     * Toujours réexécuté, même si les communes étaient déjà là : les
     * projections de population sont republiées chaque année, et les contours
     * départementaux doivent suivre toute correction du découpage communal.
     */
    const geo = await seedDepartements(dataSource);
    console.log(
      `✓ ${geo.departements} départements reconstitués, ` +
        `population renseignée sur ${geo.communesRenseignees} communes.`,
    );

    const adminId = await seedSuperAdmin();
    await seedSettings();
    await seedKoboConfig();

    if (process.env.SEED_DEMO_DATA === 'true') {
      const [{ count: nbDepistages }] = await dataSource.query(
        `SELECT COUNT(*)::int AS count FROM depistages`,
      );
      if (nbDepistages === 0) {
        console.log('→ Génération du jeu de démonstration…');
        const result = await seedDemo(dataSource, adminId);
        console.log(
          `✓ Démo : ${result.depistages} dépistages, ${result.campagnes} campagnes, ` +
            `${result.articles} articles, ${result.abonnes} abonnés.`,
        );
      } else {
        console.log(`· ${nbDepistages} dépistages déjà présents, démo ignorée.`);
      }
    }

    console.log('\n✓ Seed terminé.');
  } finally {
    await dataSource.destroy();
  }
}

async function seedSuperAdmin(): Promise<number> {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@ablode.bj';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'Ablode2026!';

  const existing = await dataSource.query(
    `SELECT id FROM users WHERE email = $1`,
    [email],
  );
  if (existing.length > 0) {
    console.log(`· Super admin ${email} déjà présent.`);
    return existing[0].id;
  }

  const hash = await bcrypt.hash(password, 12);
  const [created] = await dataSource.query(
    `INSERT INTO users (email, password_hash, nom, prenom, role, active, updated_at)
     VALUES ($1, $2, 'Anagonou', 'Koffi', 'super_admin', true, now()) RETURNING id`,
    [email, hash],
  );
  console.log(`✓ Super admin créé : ${email} / ${password}`);
  console.log('  ⚠ Changez ce mot de passe avant toute mise en production.');
  return created.id;
}

async function seedSettings(): Promise<void> {
  for (const setting of SETTINGS_DEFAUT) {
    await dataSource.query(
      `INSERT INTO settings (key, value, groupe, description, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, now())
       ON CONFLICT (key) DO NOTHING`,
      [setting.key, JSON.stringify(setting.value), setting.groupe, setting.description],
    );
  }
  console.log(`✓ ${SETTINGS_DEFAUT.length} paramètres système initialisés.`);
}

async function seedKoboConfig(): Promise<void> {
  const [{ count }] = await dataSource.query(
    `SELECT COUNT(*)::int AS count FROM kobo_config`,
  );
  if (count > 0) {
    console.log('· Configuration Kobo déjà initialisée.');
    return;
  }
  await dataSource.query(
    `INSERT INTO kobo_config (api_url, api_token, form_id, sync_interval, updated_at)
     VALUES ($1, $2, $3, 30, now())`,
    [
      process.env.KOBO_API_URL ?? 'https://kf.kobotoolbox.org',
      process.env.KOBO_API_TOKEN || null,
      process.env.KOBO_FORM_ID || null,
    ],
  );
  console.log('✓ Configuration Kobo initialisée (à compléter dans Paramètres → Kobo).');
}

main().catch((error) => {
  console.error('✗ Seed interrompu :', error);
  process.exit(1);
});
