import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthenticatedUser, CurrentUser, Roles } from 'src/common/decorators';
import { UserRole } from 'src/database/entities';
import { AuditService } from 'src/modules/audit/audit.service';
import { ImportsService } from './imports.service';

const TAILLE_MAX = 20 * 1024 * 1024; // 20 Mo

@ApiTags('Imports')
@ApiBearerAuth()
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly audit: AuditService,
  ) {}

  @Post('apercu')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Aperçu des 10 premières lignes et mapping proposé (section 3.2.3.B)',
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: TAILLE_MAX } }))
  apercu(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');
    return this.imports.apercu(file);
  }

  @Post('depistages')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Importe un fichier CSV / XLSX (US-ADM-04)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: TAILLE_MAX } }))
  async importer(
    @UploadedFile() file: Express.Multer.File,
    @Body('mapping') mappingBrut: string,
    @Body('campagneId') campagneIdBrut: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu.');

    let mapping: Record<string, string>;
    try {
      mapping = typeof mappingBrut === 'string' ? JSON.parse(mappingBrut) : mappingBrut;
    } catch {
      throw new BadRequestException(
        'Le paramètre « mapping » doit être un objet JSON valide.',
      );
    }
    if (!mapping || Object.keys(mapping).length === 0) {
      throw new BadRequestException(
        'Associez au moins une colonne du fichier à un champ de la base.',
      );
    }

    const campagneId = campagneIdBrut ? Number(campagneIdBrut) : null;
    const rapport = await this.imports.importer(
      file,
      mapping,
      Number.isFinite(campagneId) ? campagneId : null,
      user.id,
    );

    await this.audit.log({
      userId: user.id,
      action: 'import',
      entity: 'depistage',
      metadata: {
        fichier: file.originalname,
        importees: rapport.importees,
        ignorees: rapport.ignorees,
        erreurs: rapport.erreurs,
      },
      request,
    });

    return rapport;
  }
}
