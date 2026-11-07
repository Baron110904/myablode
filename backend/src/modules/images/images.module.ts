import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImagesController } from './images.controller';
import { FORMATS_IMAGE, ImagesService, LIBELLE_FORMATS_IMAGE } from './images.service';

/**
 * Plafond à l'entrée, en mégaoctets.
 *
 * Généreux à dessein : c'est la photo brute du téléphone qui arrive, et
 * c'est le serveur qui la réduit. Refuser à 2 Mo obligerait l'administrateur
 * à redimensionner lui-même avant de déposer.
 */
const TAILLE_MAX_MO = 12;

@Module({
  imports: [
    MulterModule.register({
      /*
       * En mémoire, contrairement aux vidéos : l'image doit être
       * redimensionnée avant d'être écrite, et la relire depuis le disque
       * pour la réécrire ensuite laisserait l'original derrière en cas
       * d'erreur. Douze mégaoctets tiennent sans danger dans les 512 Mo du
       * service, là où une vidéo de deux cents n'y tiendrait pas.
       */
      storage: memoryStorage(),
      limits: { fileSize: TAILLE_MAX_MO * 1024 * 1024, files: 1 },
      fileFilter: (_requete, fichier, rappel) => {
        if (!FORMATS_IMAGE.includes(fichier.mimetype)) {
          rappel(
            new BadRequestException(
              `Format « ${fichier.mimetype} » refusé. ` +
                `Formats acceptés: ${LIBELLE_FORMATS_IMAGE}.`,
            ),
            false,
          );
          return;
        }
        rappel(null, true);
      },
    }),
  ],
  controllers: [ImagesController],
  providers: [ImagesService],
})
export class ImagesModule {}
