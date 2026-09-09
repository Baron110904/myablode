import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Suivi des candidatures de bénévoles.
 *
 * « Traité » ne disait pas ce qui avait été décidé : une candidature refusée
 * et une candidature acceptée portaient la même marque. Un statut explicite
 * la remplace, et la réponse envoyée est conservée — c'est la trace de ce
 * qu'on a écrit à la personne.
 *
 * `traite` devient une colonne calculée plutôt que supprimée : les compteurs
 * et les filtres existants continuent de fonctionner sans double écriture, et
 * sans risque de désynchronisation entre les deux champs.
 */
export class CandidaturesBenevoles1756400800000 implements MigrationInterface {
  name = 'CandidaturesBenevoles1756400800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "benevoles"
        ADD COLUMN "statut" character varying(20) NOT NULL DEFAULT 'en_attente'
    `);
    await queryRunner.query(`
      ALTER TABLE "benevoles" ADD CONSTRAINT "CHK_benevoles_statut"
      CHECK ("statut" IN ('en_attente','accepte','refuse'))
    `);

    /* Réponse adressée au candidat, et sa date d'envoi. */
    await queryRunner.query(`ALTER TABLE "benevoles" ADD COLUMN "reponse" text`);
    await queryRunner.query(
      `ALTER TABLE "benevoles" ADD COLUMN "repondu_le" TIMESTAMP`,
    );

    /* Fiche agent et compte créés à l'acceptation. */
    await queryRunner.query(`ALTER TABLE "benevoles" ADD COLUMN "agent_id" integer`);
    await queryRunner.query(`ALTER TABLE "benevoles" ADD COLUMN "user_id" integer`);
    await queryRunner.query(`
      ALTER TABLE "benevoles" ADD CONSTRAINT "FK_benevole_agent"
      FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "benevoles" ADD CONSTRAINT "FK_benevole_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    /*
     * Reprise de l'existant : ce qui était marqué traité avait, en pratique,
     * été accepté — c'était la seule action possible.
     */
    await queryRunner.query(
      `UPDATE "benevoles" SET "statut" = 'accepte' WHERE "traite" = true`,
    );

    // `traite` se déduit désormais du statut.
    await queryRunner.query(`ALTER TABLE "benevoles" DROP COLUMN "traite"`);
    await queryRunner.query(`
      ALTER TABLE "benevoles"
        ADD COLUMN "traite" boolean
        GENERATED ALWAYS AS ("statut" <> 'en_attente') STORED
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_benevoles_statut" ON "benevoles" ("statut")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_benevoles_statut"`);
    await queryRunner.query(`ALTER TABLE "benevoles" DROP COLUMN IF EXISTS "traite"`);
    await queryRunner.query(
      `ALTER TABLE "benevoles" ADD COLUMN "traite" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "benevoles" SET "traite" = ("statut" <> 'en_attente')`,
    );

    await queryRunner.query(
      `ALTER TABLE "benevoles" DROP CONSTRAINT IF EXISTS "FK_benevole_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "benevoles" DROP CONSTRAINT IF EXISTS "FK_benevole_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "benevoles" DROP CONSTRAINT IF EXISTS "CHK_benevoles_statut"`,
    );
    for (const colonne of ['user_id', 'agent_id', 'repondu_le', 'reponse', 'statut']) {
      await queryRunner.query(
        `ALTER TABLE "benevoles" DROP COLUMN IF EXISTS "${colonne}"`,
      );
    }
  }
}
