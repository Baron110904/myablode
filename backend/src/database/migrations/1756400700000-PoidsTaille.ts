import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Poids et taille, d'où l'IMC est désormais calculé.
 *
 * Le formulaire de terrain demandait l'IMC directement, ce qui supposait que
 * l'agent le calcule ou le lise sur un appareil. On collecte maintenant les
 * deux mesures brutes — poids en kilogrammes, taille en centimètres — et la
 * plateforme applique `poids / taille²`.
 *
 * Trois raisons : la mesure brute est vérifiable alors qu'un IMC saisi ne
 * l'est pas ; une erreur de saisie sur le poids se voit, pas sur l'IMC ; et
 * la formule appliquée est la même pour toute la base.
 *
 * La colonne `imc` est conservée : elle porte l'IMC des dépistages déjà
 * collectés, pour lesquels le poids et la taille n'ont jamais été relevés.
 */
export class PoidsTaille1756400700000 implements MigrationInterface {
  name = 'PoidsTaille1756400700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
     * `numeric(6,2)` accepte jusqu'à 9999,99 : largement au-delà du plausible.
     * Les bornes de vraisemblance sont appliquées dans le code, qui signale
     * sans refuser — la colonne ne doit pas être ce qui rejette une ligne.
     */
    await queryRunner.query(
      `ALTER TABLE "depistages" ADD COLUMN "poids" numeric(6,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" ADD COLUMN "taille" numeric(6,2)`,
    );

    await queryRunner.query(
      `COMMENT ON COLUMN "depistages"."poids" IS 'Poids en kilogrammes'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "depistages"."taille" IS 'Taille en centimètres'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "depistages" DROP COLUMN IF EXISTS "taille"`);
    await queryRunner.query(`ALTER TABLE "depistages" DROP COLUMN IF EXISTS "poids"`);
  }
}
