import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { AuditLog } from 'src/database/entities';
import { PaginatedResult, PaginationDto, paginate } from 'src/common/dto/pagination.dto';

export interface AuditEntry {
  userId: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
  request?: Request;
}

/**
 * Journal d'audit (section 6.2 « Journalisation »). Écriture seule : aucune
 * route de modification ou de suppression n'est exposée.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.repository.insert({
        user_id: entry.userId,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        metadata: (entry.metadata ?? null) as never,
        ip_address: entry.request ? extractIp(entry.request) : null,
        user_agent: entry.request?.headers['user-agent']?.slice(0, 255) ?? null,
      });
    } catch (error) {
      // Tracer ne doit jamais faire échouer l'action métier tracée.
      this.logger.error(
        `Écriture du journal d'audit impossible (${entry.action}/${entry.entity}) : ${(error as Error).message}`,
      );
    }
  }

  async findAll(
    pagination: PaginationDto,
    filtres: { userId?: number; entity?: string; action?: string } = {},
  ): Promise<PaginatedResult<AuditLog>> {
    const query = this.repository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    if (filtres.userId) {
      query.andWhere('log.user_id = :userId', { userId: filtres.userId });
    }
    if (filtres.entity) {
      query.andWhere('log.entity = :entity', { entity: filtres.entity });
    }
    if (filtres.action) {
      query.andWhere('log.action = :action', { action: filtres.action });
    }

    const [items, total] = await query.getManyAndCount();
    return paginate(items, total, pagination);
  }

  /** Alimente le widget « Activité récente » du tableau de bord. */
  async findRecent(limit = 10): Promise<AuditLog[]> {
    return this.repository.find({
      relations: { user: true },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}

function extractIp(request: Request): string | null {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim().slice(0, 45);
  }
  return (request.ip ?? request.socket?.remoteAddress ?? null)?.slice(0, 45) ?? null;
}
