import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schéma initial MyABLODE — reprend le DDL de la section 5.2 des
 * spécifications, complété par les tables de support (settings, contacts,
 * bénévoles, journal de synchronisation Kobo).
 */
export class InitialSchema1756400000000 implements MigrationInterface {
  name = 'InitialSchema1756400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);

    await queryRunner.query(`
      CREATE TABLE "communes" (
        "id" SERIAL PRIMARY KEY,
        "nom" character varying(100) NOT NULL,
        "code" character varying(10),
        "departement" character varying(60),
        "geometry" geometry(Geometry, 4326),
        "centroid_lat" double precision,
        "centroid_lng" double precision,
        "population" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_communes_code" UNIQUE ("code")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_communes_geom" ON "communes" USING GiST ("geometry")`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "email" character varying(150) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "nom" character varying(100) NOT NULL,
        "prenom" character varying(100) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'viewer',
        "twofa_secret" character varying(255),
        "twofa_enabled" boolean NOT NULL DEFAULT false,
        "refresh_token_hash" character varying(255),
        "reset_token_hash" character varying(255),
        "reset_token_expires_at" TIMESTAMP,
        "last_login" TIMESTAMP,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "CHK_users_role" CHECK ("role" IN ('super_admin', 'admin', 'viewer'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "campagnes" (
        "id" SERIAL PRIMARY KEY,
        "commune_id" integer,
        "nom" character varying(150) NOT NULL,
        "date_debut" date NOT NULL,
        "date_fin" date,
        "responsable" character varying(100),
        "equipe" text,
        "statut" character varying(20) NOT NULL DEFAULT 'planifiee',
        "description" text,
        "photo_url" character varying(255),
        "archivee" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "FK_campagnes_commune" FOREIGN KEY ("commune_id")
          REFERENCES "communes"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_campagnes_statut" CHECK ("statut" IN ('planifiee', 'en_cours', 'cloturee'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_campagnes_commune" ON "campagnes" ("commune_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "depistages" (
        "id" SERIAL PRIMARY KEY,
        "commune_id" integer,
        "campagne_id" integer,
        "user_id" integer,
        "code_unique" character varying(50),
        "nom" character varying(100) NOT NULL,
        "prenom" character varying(100) NOT NULL,
        "date_naissance" date NOT NULL,
        "sexe" character varying(1) NOT NULL,
        "telephone" character varying(20),
        "date_depistage" date NOT NULL,
        "type" character varying(20) NOT NULL,
        "glycemie" numeric(5,2),
        "imc" numeric(5,2),
        "resultat" character varying(30) NOT NULL,
        "oriente_centre" boolean NOT NULL DEFAULT false,
        "notes" text,
        "source" character varying(20) NOT NULL DEFAULT 'manual',
        "kobo_id" character varying(100),
        "localisation" geometry(Point, 4326),
        "verifie" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        "deleted_at" TIMESTAMP,
        CONSTRAINT "UQ_depistages_kobo_id" UNIQUE ("kobo_id"),
        CONSTRAINT "FK_depistages_commune" FOREIGN KEY ("commune_id")
          REFERENCES "communes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_depistages_campagne" FOREIGN KEY ("campagne_id")
          REFERENCES "campagnes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_depistages_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_depistages_sexe" CHECK ("sexe" IN ('M', 'F')),
        CONSTRAINT "CHK_depistages_type" CHECK ("type" IN ('diabete', 'obesite', 'endocrinopathie')),
        CONSTRAINT "CHK_depistages_resultat" CHECK ("resultat" IN ('normal', 'pre-diabete', 'diabete', 'obesite', 'autre')),
        CONSTRAINT "CHK_depistages_source" CHECK ("source" IN ('kobo', 'file', 'manual'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_commune" ON "depistages" ("commune_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_campagne" ON "depistages" ("campagne_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_date" ON "depistages" ("date_depistage")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_resultat" ON "depistages" ("resultat")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_commune_date" ON "depistages" ("commune_id", "date_depistage")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_resultat_date" ON "depistages" ("resultat", "date_depistage")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_geom" ON "depistages" USING GiST ("localisation")`,
    );

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" SERIAL PRIMARY KEY,
        "titre" character varying(200) NOT NULL,
        "slug" character varying(220) NOT NULL,
        "extrait" character varying(500),
        "contenu" text NOT NULL,
        "image_url" character varying(255),
        "categorie" character varying(30) NOT NULL,
        "auteur" character varying(120),
        "langue" character varying(5) NOT NULL DEFAULT 'fr',
        "statut" character varying(20) NOT NULL DEFAULT 'draft',
        "date_publication" TIMESTAMP,
        "meta_title" character varying(200),
        "meta_description" character varying(300),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_articles_slug" UNIQUE ("slug"),
        CONSTRAINT "CHK_articles_categorie" CHECK ("categorie" IN ('campagnes', 'sensibilisation', 'resultats', 'evenements')),
        CONSTRAINT "CHK_articles_statut" CHECK ("statut" IN ('draft', 'published', 'archived'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_articles_statut_date" ON "articles" ("statut", "date_publication")`,
    );

    await queryRunner.query(`
      CREATE TABLE "images" (
        "id" SERIAL PRIMARY KEY,
        "article_id" integer,
        "url" character varying(255) NOT NULL,
        "nom" character varying(255) NOT NULL,
        "taille" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_images_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "newsletter" (
        "id" SERIAL PRIMARY KEY,
        "email" character varying(150) NOT NULL,
        "token" character varying(64) NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_newsletter_email" UNIQUE ("email"),
        CONSTRAINT "UQ_newsletter_token" UNIQUE ("token")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "newsletter_envois" (
        "id" SERIAL PRIMARY KEY,
        "article_id" integer,
        "sujet" character varying(200) NOT NULL,
        "contenu" text NOT NULL,
        "statut" character varying(20) NOT NULL DEFAULT 'planifie',
        "nb_destinataires" integer NOT NULL DEFAULT 0,
        "nb_ouvertures" integer NOT NULL DEFAULT 0,
        "nb_clics" integer NOT NULL DEFAULT 0,
        "date_envoi" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_newsletter_envois_article" FOREIGN KEY ("article_id")
          REFERENCES "articles"("id") ON DELETE SET NULL,
        CONSTRAINT "CHK_newsletter_envois_statut" CHECK ("statut" IN ('envoye', 'echec', 'planifie'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer,
        "action" character varying(50) NOT NULL,
        "entity" character varying(50) NOT NULL,
        "entity_id" integer,
        "metadata" jsonb,
        "ip_address" character varying(45),
        "user_agent" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_audit_logs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_user_date" ON "audit_logs" ("user_id", "created_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "kobo_config" (
        "id" SERIAL PRIMARY KEY,
        "api_url" character varying(255) NOT NULL DEFAULT 'https://kf.kobotoolbox.org',
        "api_token" character varying(255),
        "form_id" character varying(100),
        "sync_interval" integer NOT NULL DEFAULT 30,
        "auto_sync_enabled" boolean NOT NULL DEFAULT false,
        "last_sync_at" TIMESTAMP,
        "last_sync_status" character varying(20) NOT NULL DEFAULT 'jamais',
        "last_sync_message" text,
        "last_sync_count" integer NOT NULL DEFAULT 0,
        "field_mapping" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "kobo_sync_logs" (
        "id" SERIAL PRIMARY KEY,
        "statut" character varying(20) NOT NULL,
        "declencheur" character varying(20) NOT NULL,
        "nb_recus" integer NOT NULL DEFAULT 0,
        "nb_importes" integer NOT NULL DEFAULT 0,
        "nb_doublons" integer NOT NULL DEFAULT 0,
        "nb_erreurs" integer NOT NULL DEFAULT 0,
        "duree_ms" integer,
        "message" text,
        "details" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "settings" (
        "key" character varying(100) PRIMARY KEY,
        "value" jsonb NOT NULL,
        "groupe" character varying(50) NOT NULL,
        "description" character varying(255),
        "updated_at" TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "contacts" (
        "id" SERIAL PRIMARY KEY,
        "nom" character varying(120) NOT NULL,
        "email" character varying(150) NOT NULL,
        "sujet" character varying(200),
        "message" text NOT NULL,
        "traite" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "benevoles" (
        "id" SERIAL PRIMARY KEY,
        "nom" character varying(100) NOT NULL,
        "prenom" character varying(100) NOT NULL,
        "email" character varying(150) NOT NULL,
        "telephone" character varying(20),
        "ville" character varying(100),
        "disponibilite" character varying(100),
        "message" text,
        "traite" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "benevoles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contacts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kobo_sync_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "kobo_config"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "newsletter_envois"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "newsletter"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "images"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "articles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "depistages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "campagnes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "communes"`);
  }
}
