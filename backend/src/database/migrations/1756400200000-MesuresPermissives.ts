import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Élargit les colonnes de mesure pour ne perdre aucune saisie.
 *
 * `numeric(5,2)` plafonne à 999,99 : une glycémie mal saisie à 1200 faisait
 * échouer l'insertion et la ligne entière était perdue. La collecte doit
 * d'abord tout récupérer — une valeur aberrante est signalée dans les notes,
 * puis corrigée depuis le back-office.
 */
export class MesuresPermissives1756400200000 implements MigrationInterface {
  name = 'MesuresPermissives1756400200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "depistages" ALTER COLUMN "glycemie" TYPE numeric(8,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" ALTER COLUMN "imc" TYPE numeric(8,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Les valeurs hors de numeric(5,2) empêcheraient le retour en arrière.
    await queryRunner.query(
      `UPDATE "depistages" SET "glycemie" = NULL WHERE "glycemie" > 999.99`,
    );
    await queryRunner.query(
      `UPDATE "depistages" SET "imc" = NULL WHERE "imc" > 999.99`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" ALTER COLUMN "glycemie" TYPE numeric(5,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" ALTER COLUMN "imc" TYPE numeric(5,2)`,
    );
  }
}
