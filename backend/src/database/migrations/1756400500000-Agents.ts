import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agents de terrain et leurs affectations.
 *
 * Un agent n'est pas un utilisateur du back-office : il collecte sur le
 * terrain avec KoboCollect et n'a le plus souvent aucun compte sur la
 * plateforme. D'où une table distincte de `users` — les deux notions ne se
 * recouvrent que par exception.
 *
 * Le rattachement d'un dépistage à son agent passe par `code_kobo`, le
 * matricule que l'agent saisit dans le formulaire. C'est la seule clé dont
 * on dispose : Kobo ne transmet pas d'identité d'enquêteur exploitable.
 */
export class Agents1756400500000 implements MigrationInterface {
  name = 'Agents1756400500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agents" (
        "id" SERIAL PRIMARY KEY,
        "nom" character varying(100) NOT NULL,
        "prenom" character varying(100) NOT NULL,
        "code_kobo" character varying(40),
        "telephone" character varying(20),
        "email" character varying(180),
        "role_terrain" character varying(30) NOT NULL DEFAULT 'agent',
        "actif" boolean NOT NULL DEFAULT true,
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP,
        CONSTRAINT "UQ_agents_code_kobo" UNIQUE ("code_kobo")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_agents_actif" ON "agents" ("actif") WHERE "actif" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_agents_nom" ON "agents" (unaccent_lower("nom"))`,
    );

    /*
     * Affectations : un agent peut couvrir plusieurs communes sur une même
     * campagne, et une commune être partagée entre plusieurs agents. D'où une
     * table de liaison plutôt qu'une colonne sur l'agent.
     */
    await queryRunner.query(`
      CREATE TABLE "agent_affectations" (
        "id" SERIAL PRIMARY KEY,
        "agent_id" integer NOT NULL,
        "campagne_id" integer,
        "commune_id" integer,
        "date_debut" date,
        "date_fin" date,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_affectation_agent" FOREIGN KEY ("agent_id")
          REFERENCES "agents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_affectation_campagne" FOREIGN KEY ("campagne_id")
          REFERENCES "campagnes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_affectation_commune" FOREIGN KEY ("commune_id")
          REFERENCES "communes"("id") ON DELETE CASCADE,
        /* Une même paire agent/campagne/commune ne se saisit qu'une fois. */
        CONSTRAINT "UQ_affectation" UNIQUE ("agent_id", "campagne_id", "commune_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_affectations_agent" ON "agent_affectations" ("agent_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_affectations_campagne" ON "agent_affectations" ("campagne_id")`,
    );

    /*
     * Encouragements adressés aux agents depuis le suivi en direct. Conservés
     * plutôt qu'envoyés et oubliés : ils forment l'historique de ce qui a été
     * reconnu, et évitent de féliciter deux fois la même performance.
     */
    await queryRunner.query(`
      CREATE TABLE "agent_felicitations" (
        "id" SERIAL PRIMARY KEY,
        "agent_id" integer,
        "commune_id" integer,
        "auteur_id" integer NOT NULL,
        "message" character varying(280) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_felicitation_agent" FOREIGN KEY ("agent_id")
          REFERENCES "agents"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_felicitation_commune" FOREIGN KEY ("commune_id")
          REFERENCES "communes"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_felicitation_auteur" FOREIGN KEY ("auteur_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_felicitations_date" ON "agent_felicitations" ("created_at" DESC)`,
    );

    /* Rattachement d'un dépistage à l'agent qui l'a collecté. */
    await queryRunner.query(
      `ALTER TABLE "depistages" ADD COLUMN "agent_id" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" ADD CONSTRAINT "FK_depistage_agent"
       FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_agent" ON "depistages" ("agent_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_depistages_agent"`);
    await queryRunner.query(
      `ALTER TABLE "depistages" DROP CONSTRAINT IF EXISTS "FK_depistage_agent"`,
    );
    await queryRunner.query(`ALTER TABLE "depistages" DROP COLUMN IF EXISTS "agent_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_felicitations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_affectations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agents"`);
  }
}
