import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { CacheService } from 'src/common/cache/cache.service';
import { Public } from 'src/common/decorators';

@ApiTags('Santé')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'État de l’API et de ses dépendances' })
  async check() {
    const basePrete = await this.verifierBase();
    return {
      statut: basePrete ? 'ok' : 'degrade',
      base: basePrete ? 'connectee' : 'indisponible',
      // Redis absent dégrade les performances sans casser le service.
      cache: this.cache.isDisponible() ? 'connecte' : 'indisponible',
      horodatage: new Date().toISOString(),
    };
  }

  private async verifierBase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
