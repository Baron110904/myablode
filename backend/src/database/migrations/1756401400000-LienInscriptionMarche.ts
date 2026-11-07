import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `formulaires_marche.lien_externe` — inscrire ailleurs que sur le site.
 *
 * L'inscription à la marche passait obligatoirement par le bulletin hébergé
 * ici. L'association ouvre parfois les inscriptions sur un autre support -
 * un questionnaire en ligne, la billetterie d'un partenaire - et n'avait
 * alors aucun moyen d'y renvoyer depuis l'article : il fallait publier un
 * bulletin dont personne ne se servait, ou ne rien publier du tout.
 *
 * Renseigner cette adresse suffit : l'appel à s'inscrire y mène, et le
 * bulletin interne s'efface. L'un ou l'autre, jamais les deux - deux portes
 * d'entrée pour une même inscription produisent deux listes de participants.
 */
export class LienInscriptionMarche1756401400000 implements MigrationInterface {
  name = 'LienInscriptionMarche1756401400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" ADD COLUMN "lien_externe" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "formulaires_marche" DROP COLUMN "lien_externe"`,
    );
  }
}
