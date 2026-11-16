import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Orientation des vidéos, et date d'événement des articles.
 *
 * Deux colonnes sans rapport l'une avec l'autre, posées ensemble parce
 * qu'elles répondent à la même revue.
 *
 * `videos.orientation` — le lecteur public imposait un cadre 16:9 à toutes
 * les vidéos. Celles filmées au téléphone, à la verticale, s'y retrouvaient
 * encadrées de deux larges bandes noires. L'orientation ne se devine pas du
 * fichier de façon fiable : une vidéo verticale peut être encodée en 16:9
 * avec une rotation portée par ses métadonnées, que tous les lecteurs ne
 * respectent pas. Elle est donc déclarée au dépôt.
 *
 * Valeur par défaut `paysage` : c'est le cas de toutes les vidéos déjà en
 * ligne, et la colonne ne peut donc pas être nulle.
 *
 * `articles.date_evenement` — les cartes d'actualité portaient la date de
 * publication. Sur l'annonce d'une marche, le visiteur lisait la date à
 * laquelle l'article avait paru et croyait y lire celle de la marche. La
 * colonne reste facultative : un compte rendu ou un communiqué n'a pas de
 * date d'événement, et garde alors celle de sa publication.
 *
 * Type `date` et non `timestamp` : l'heure du rendez-vous est donnée dans le
 * corps de l'article, la carte n'affiche qu'un jour.
 */
export class OrientationVideoDateEvenement1756401700000 implements MigrationInterface {
  name = 'OrientationVideoDateEvenement1756401700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos"
         ADD COLUMN "orientation" character varying(10) NOT NULL DEFAULT 'paysage'`,
    );
    await queryRunner.query(`ALTER TABLE "articles" ADD COLUMN "date_evenement" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "date_evenement"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "orientation"`);
  }
}
