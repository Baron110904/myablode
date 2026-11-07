import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';

/**
 * Formats acceptés, et extension écrite sur le disque pour chacun.
 *
 * Deux seulement, et ce n'est pas une frilosité : la promesse faite à
 * l'administrateur est « la vidéo sera visible sur le site ». MP4 (H.264) et
 * WebM sont les deux conteneurs que lisent tous les navigateurs actuels.
 * Accepter un .mov ou un .avi reviendrait à accepter un fichier qui
 * s'envoie bien et ne se lit nulle part — un échec silencieux, découvert par
 * le visiteur.
 */
export const FORMATS_VIDEO: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
};

export const LIBELLE_FORMATS = 'MP4 (H.264) ou WebM';

/** Sous-dossier des vidéos, relatif à la racine des téléversements. */
export const SOUS_DOSSIER_VIDEOS = 'videos';

/** Préfixe d'URL sous lequel l'API sert les fichiers déposés. */
export const PREFIXE_UPLOADS = '/uploads';

/**
 * Racine des fichiers déposés, résolue une fois pour toutes.
 *
 * Absolue de préférence : un chemin relatif dépend du répertoire de travail
 * du processus, qui n'est pas le même en développement (`backend/`) et dans
 * l'image Docker (`/app`).
 */
export function racineUploads(config: ConfigService): string {
  const brut = config.get<string>('uploads.dir') ?? 'uploads';
  return isAbsolute(brut) ? brut : resolve(process.cwd(), brut);
}

export function dossierVideos(config: ConfigService): string {
  const dossier = join(racineUploads(config), SOUS_DOSSIER_VIDEOS);
  // Multer échoue sans message lisible si la destination n'existe pas.
  mkdirSync(dossier, { recursive: true });
  return dossier;
}

/**
 * Nom du fichier stocké.
 *
 * Il est tiré au sort et son extension vient du type MIME reconnu, jamais du
 * nom envoyé par le navigateur : aucun fragment de chaîne contrôlée par le
 * client n'atteint le système de fichiers, ce qui ferme d'un coup la
 * traversée de répertoire et la double extension (« clip.mp4.php »).
 */
export function nomDeFichier(mimetype: string): string {
  const extension = FORMATS_VIDEO[mimetype];
  if (!extension) {
    throw new BadRequestException(`Format refusé. Formats acceptés: ${LIBELLE_FORMATS}.`);
  }
  return `${randomUUID()}${extension}`;
}

/** Adresse publique correspondant à un nom de fichier stocké. */
export function urlPublique(nom: string): string {
  return `${PREFIXE_UPLOADS}/${SOUS_DOSSIER_VIDEOS}/${nom}`;
}
