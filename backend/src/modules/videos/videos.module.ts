import { BadRequestException, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { diskStorage } from 'multer';
import { Video } from 'src/database/entities';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { FORMATS_VIDEO, LIBELLE_FORMATS, dossierVideos, nomDeFichier } from './stockage';

/** Plafond par défaut, en mégaoctets. */
const TAILLE_MAX_MO = 200;

@Module({
  imports: [
    TypeOrmModule.forFeature([Video]),

    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        /*
         * Écriture directe sur le disque, et non en mémoire : une vidéo de
         * deux cents mégaoctets tamponnée en RAM suffirait à faire tomber le
         * service, qui tourne sur 512 Mo.
         */
        storage: diskStorage({
          destination: dossierVideos(config),
          filename: (_requete, fichier, rappel) => {
            try {
              rappel(null, nomDeFichier(fichier.mimetype));
            } catch (erreur) {
              rappel(erreur as Error, '');
            }
          },
        }),
        limits: {
          fileSize:
            (config.get<number>('uploads.maxVideoMo') ?? TAILLE_MAX_MO) * 1024 * 1024,
          // Un seul fichier par requête, et pas de champ à rallonge.
          files: 1,
        },
        fileFilter: (_requete, fichier, rappel) => {
          if (!FORMATS_VIDEO[fichier.mimetype]) {
            rappel(
              new BadRequestException(
                `Format « ${fichier.mimetype} » refusé. ` +
                  `Formats acceptés : ${LIBELLE_FORMATS}.`,
              ),
              false,
            );
            return;
          }
          rappel(null, true);
        },
      }),
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
