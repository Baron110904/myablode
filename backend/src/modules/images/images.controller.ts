import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { ImagesService } from './images.service';

/**
 * Dépôt d'images, commun à tout le back-office.
 *
 * Une seule route pour l'illustration d'un article comme pour la miniature
 * d'une vidéo : le format accepté, la taille maximale et le
 * redimensionnement y sont décidés une fois, au lieu d'être réécrits - et
 * divergés - à chaque formulaire.
 */
@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly images: ImagesService) {}

  @Post()
  /*
   * Plafond propre à cette route, plus bas que la limite générale.
   *
   * Chaque appel accepte douze mégaoctets et les écrit sur le disque. Sous
   * la limite globale de cent requêtes par minute, un compte administrateur
   * compromis - ou un script lancé par mégarde - y déverse 1,2 Go par
   * minute. Trente dépôts par minute restent très au-delà de ce qu'une
   * personne fait à la main.
   */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Dépose une image et renvoie son adresse publique' })
  @UseInterceptors(FileInterceptor('fichier'))
  deposer(@UploadedFile() fichier: Express.Multer.File) {
    return this.images.deposer(fichier);
  }
}
