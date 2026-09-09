import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import {
  AuthenticatedUser,
  CurrentUser,
  Public,
  Roles,
} from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { CommunesService } from './communes.service';

@ApiTags('Communes')
@Controller('communes')
export class CommunesController {
  constructor(
    private readonly communes: CommunesService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liste des 77 communes du Bénin' })
  findAll() {
    return this.communes.findAll();
  }

  @Public()
  @Get('geometries')
  @ApiOperation({ summary: 'Contours GeoJSON des communes (fond de carte)' })
  geometries() {
    return this.communes.geometries();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une commune' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.communes.findOne(id);
  }

  @Post('geojson')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Remplace les contours des communes (US-ADM-16)' })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  async uploadGeoJson(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu.');
    }

    let collection: unknown;
    try {
      collection = JSON.parse(file.buffer.toString('utf8'));
    } catch {
      throw new BadRequestException('Le fichier n’est pas un JSON valide.');
    }

    const resultat = await this.communes.remplacerGeometries(collection as never);
    await this.audit.log({
      userId: user.id,
      action: 'update',
      entity: 'communes',
      metadata: {
        fichier: file.originalname,
        misesAJour: resultat.misesAJour,
        ignorees: resultat.ignorees.length,
      },
      request,
    });
    return resultat;
  }
}
