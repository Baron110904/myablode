import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `evenements.date_retrait` — faire disparaître une date du site à l'heure dite.
 *
 * Une date quittait l'accueil le lendemain de sa tenue, et pas avant. Or une
 * conférence dont les inscriptions ferment la veille, ou une projection
 * annulée, doivent pouvoir sortir du bandeau sans attendre - et sans être
 * dépubliées à la main un dimanche soir.
 *
 * Nulle par défaut : les dates déjà saisies gardent le comportement qu'elles
 * avaient, elles restent jusqu'au lendemain de leur tenue.
 */
export class RetraitEvenement1756401500000 implements MigrationInterface {
  name = 'RetraitEvenement1756401500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "evenements" ADD COLUMN "date_retrait" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "evenements" DROP COLUMN "date_retrait"`);
  }
}
