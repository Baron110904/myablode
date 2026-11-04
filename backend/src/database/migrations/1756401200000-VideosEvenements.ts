import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deux tables pour la refonte éditoriale du site vitrine.
 *
 * `videos` : les fichiers déposés depuis le back-office pour la section
 * « Nos actions en vidéo ». Seules les métadonnées vivent ici ; le fichier
 * lui-même est écrit sur le disque de l'API, sous `uploads/videos`.
 *
 * `evenements` : les dates fortes d'une édition — conférence de presse,
 * grande marche, projection. Elles alimentent le bandeau chronologique de
 * l'accueil et l'encart « Les grandes dates ». On ne les range pas dans
 * `campagnes` : une campagne est rattachée à une commune et porte des
 * dépistages, un événement n'a ni l'un ni l'autre.
 */
export class VideosEvenements1756401200000 implements MigrationInterface {
  name = 'VideosEvenements1756401200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "videos" (
        "id" SERIAL PRIMARY KEY,
        "titre" character varying(200) NOT NULL,
        "description" text,
        "categorie" character varying(30) NOT NULL,
        "fichier_url" character varying(255) NOT NULL,
        "fichier_nom" character varying(255) NOT NULL,
        "taille" bigint,
        "mime" character varying(100),
        "miniature_url" character varying(255),
        "duree_secondes" integer,
        "statut" character varying(20) NOT NULL DEFAULT 'draft',
        "a_la_une" boolean NOT NULL DEFAULT false,
        "date_publication" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_videos_statut_date" ON "videos" ("statut", "date_publication")`,
    );

    await queryRunner.query(`
      CREATE TABLE "evenements" (
        "id" SERIAL PRIMARY KEY,
        "titre" character varying(200) NOT NULL,
        "sous_titre" character varying(255),
        "date_debut" date NOT NULL,
        "date_fin" date,
        "lieu" character varying(200),
        "description" text,
        "edition" character varying(60),
        "publie" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_evenements_publie_date" ON "evenements" ("publie", "date_debut")`,
    );

    /*
     * Une date de fin antérieure au début passerait inaperçue à l'écriture et
     * donnerait un bandeau incohérent — « du 30 au 1er ». La base refuse.
     */
    await queryRunner.query(`
      ALTER TABLE "evenements"
      ADD CONSTRAINT "chk_evenements_dates"
      CHECK ("date_fin" IS NULL OR "date_fin" >= "date_debut")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "evenements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "videos"`);
  }
}
