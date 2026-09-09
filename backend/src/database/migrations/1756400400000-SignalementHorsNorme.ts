import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Signalement des mesures hors norme, sans rejet.
 *
 * La collecte doit tout récupérer : une glycémie de 1 200 mg/dL est presque
 * sûrement une erreur de saisie ou d'unité, mais la refuser fait perdre la
 * ligne entière — nom, commune, date, tout. Elle est donc enregistrée telle
 * quelle et marquée, pour qu'une équipe la reprenne depuis le back-office.
 *
 * Deux familles de seuils cohabitent, et il ne faut pas les confondre :
 *
 * — Les **seuils cliniques** (table `settings`) décident du résultat :
 *   normal, pré-diabète, diabète, obésité.
 * — Les **bornes de vraisemblance** (ici) ne décident de rien : elles
 *   signalent qu'une valeur sort du domaine physiologique et mérite un
 *   contrôle humain.
 */
export class SignalementHorsNorme1756400400000 implements MigrationInterface {
  name = 'SignalementHorsNorme1756400400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "depistages" ADD COLUMN "hors_norme" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "depistages" ADD COLUMN "motif_hors_norme" character varying(160)`,
    );

    /*
     * Index partiel : les lignes signalées sont une petite minorité, et
     * l'écran de vérification ne demande qu'elles. Indexer les 11 000 autres
     * ne servirait à rien.
     */
    await queryRunner.query(
      `CREATE INDEX "idx_depistages_hors_norme" ON "depistages" ("hors_norme")
       WHERE "hors_norme" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_depistages_hors_norme"`);
    await queryRunner.query(`ALTER TABLE "depistages" DROP COLUMN IF EXISTS "motif_hors_norme"`);
    await queryRunner.query(`ALTER TABLE "depistages" DROP COLUMN IF EXISTS "hors_norme"`);
  }
}
