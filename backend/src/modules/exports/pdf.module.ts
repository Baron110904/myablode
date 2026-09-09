import { Global, Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

/**
 * Module dédié au rendu PDF. Isolé et global pour que les campagnes puissent
 * générer leur rapport sans dépendre d'ExportsModule — qui dépend lui-même
 * des statistiques, lesquelles dépendent des campagnes.
 */
@Global()
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
