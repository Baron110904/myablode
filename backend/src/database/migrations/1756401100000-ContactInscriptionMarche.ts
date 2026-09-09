import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Courriel et téléphone sur les inscriptions à la marche.
 *
 * Le téléphone sert le jour même : prévenir d'un changement d'heure ou de
 * point de départ. Le courriel sert après : c'est lui qui rattache l'inscrit
 * à la lettre d'information.
 *
 * Les deux colonnes sont nullables en base bien que le formulaire les exige.
 * Les inscriptions déjà reçues n'en ont pas, et leur imposer une valeur
 * inventée serait pire que de les laisser vides.
 */
export class ContactInscriptionMarche1756401100000 implements MigrationInterface {
  name = 'ContactInscriptionMarche1756401100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" ADD COLUMN "email" character varying(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" ADD COLUMN "telephone" character varying(30)`,
    );

    /*
     * Le courriel sert à retrouver une inscription et à recouper avec les
     * abonnés : indexé sur sa forme normalisée, comme partout ailleurs.
     */
    await queryRunner.query(
      `CREATE INDEX "idx_inscriptions_email" ON "inscriptions_marche" (lower("email"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inscriptions_email"`);
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" DROP COLUMN IF EXISTS "telephone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inscriptions_marche" DROP COLUMN IF EXISTS "email"`,
    );
  }
}
