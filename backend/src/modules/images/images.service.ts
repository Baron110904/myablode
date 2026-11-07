import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { OutputInfo } from 'sharp';
import { PREFIXE_UPLOADS, racineUploads } from 'src/modules/videos/stockage';

/** Sous-dossier des images, relatif à la racine des téléversements. */
export const SOUS_DOSSIER_IMAGES = 'images';

/**
 * Formats acceptés à l'entrée.
 *
 * Ce sont ceux que produisent un téléphone et un appareil photo. Le fichier
 * stocké, lui, est toujours du WebP : un seul format en sortie évite d'avoir
 * à raisonner sur ce que le navigateur du visiteur sait lire.
 */
export const FORMATS_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
export const LIBELLE_FORMATS_IMAGE = 'JPEG, PNG ou WebP';

/**
 * Largeur maximale conservée.
 *
 * Les illustrations d'article s'affichent sur 640 px au plus dans la grille,
 * et sur 1 200 px en tête d'un article. 1 600 couvre les écrans à forte
 * densité sans conserver les 4 000 px d'une photo de téléphone.
 */
const LARGEUR_MAX = 1600;

export interface ImageDeposee {
  url: string;
  largeur: number;
  hauteur: number;
  /** Taille du fichier écrit, en octets. */
  taille: number;
}

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(private readonly config: ConfigService) {}

  private dossier(): string {
    const dossier = join(racineUploads(this.config), SOUS_DOSSIER_IMAGES);
    mkdirSync(dossier, { recursive: true });
    return dossier;
  }

  /**
   * Enregistre une image déposée au back-office.
   *
   * Elle est redimensionnée et recompressée avant d'être écrite. Sans cela,
   * la photo de téléphone de cinq mégaoctets déposée par l'administrateur
   * part telle quelle vers chaque visiteur : l'illustration d'article est
   * servie hors du redimensionnement de Next, qui ne s'applique qu'aux
   * fichiers locaux.
   */
  async deposer(fichier: Express.Multer.File): Promise<ImageDeposee> {
    if (!fichier?.buffer?.length) {
      throw new BadRequestException('Aucun fichier reçu.');
    }
    if (!FORMATS_IMAGE.includes(fichier.mimetype)) {
      throw new BadRequestException(
        `Format « ${fichier.mimetype} » refusé. Formats acceptés: ${LIBELLE_FORMATS_IMAGE}.`,
      );
    }

    let transforme: { data: Buffer; info: OutputInfo };
    try {
      transforme = await sharp(fichier.buffer)
        /*
         * Orientation d'abord. sharp remet aujourd'hui les opérations dans
         * le bon ordre de lui-même - vérifié : une photo portrait EXIF sort
         * en 1600x2133 quel que soit l'ordre d'appel. L'écrire dans l'ordre
         * logique ne coûte rien et ne dépend plus de ce comportement.
         */
        .rotate()
        // `withoutEnlargement` : une petite image ne doit pas être étirée,
        // on ne gagnerait que du poids et du flou.
        .resize({ width: LARGEUR_MAX, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch (erreur) {
      this.logger.warn(`Image illisible: ${(erreur as Error).message}`);
      throw new BadRequestException(
        'Ce fichier n’est pas une image lisible. Déposez un JPEG, un PNG ou un WebP.',
      );
    }

    /*
     * Nom tiré au sort, extension imposée par le format de sortie : aucun
     * fragment de chaîne contrôlée par le client n'atteint le système de
     * fichiers, ce qui ferme la traversée de répertoire et la double
     * extension (« photo.jpg.php »).
     */
    const nom = `${randomUUID()}.webp`;
    await writeFile(join(this.dossier(), nom), transforme.data);

    return {
      url: `${PREFIXE_UPLOADS}/${SOUS_DOSSIER_IMAGES}/${nom}`,
      largeur: transforme.info.width,
      hauteur: transforme.info.height,
      taille: transforme.data.length,
    };
  }
}
