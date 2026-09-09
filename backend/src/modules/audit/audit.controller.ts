import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UserRole } from 'src/database/entities';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Journal des actions administrateur (US-ADM-13)' })
  findAll(
    @Query() pagination: PaginationDto,
    @Query('userId') userId?: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
  ) {
    return this.auditService.findAll(pagination, {
      userId: userId ? Number(userId) : undefined,
      entity,
      action,
    });
  }

  @Get('recent')
  @ApiOperation({ summary: 'Dernières actions, pour le tableau de bord' })
  findRecent() {
    return this.auditService.findRecent(10);
  }
}
