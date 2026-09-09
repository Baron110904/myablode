import { Module } from '@nestjs/common';
import { CommunesModule } from 'src/modules/communes/communes.module';
import { DepistagesModule } from 'src/modules/depistages/depistages.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [CommunesModule, DepistagesModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}
