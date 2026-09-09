import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Cache des agrégations statistiques (section 3.1.2 « Performance »).
 *
 * Redis indisponible n'est pas une panne : le service repasse en lecture
 * directe sur PostgreSQL. Le site public reste debout, simplement plus lent.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;
  private disponible = false;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('redis.host');
    const port = this.config.get<number>('redis.port');
    const password = this.config.get<string>('redis.password');

    try {
      this.client = new Redis({
        host,
        port,
        password,
        lazyConnect: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
      });
      this.client.on('ready', () => {
        this.disponible = true;
        this.logger.log(`Cache Redis connecté sur ${host}:${port}`);
      });
      this.client.on('error', (error) => {
        if (this.disponible) {
          this.logger.warn(`Redis indisponible, repli sur la base : ${error.message}`);
        }
        this.disponible = false;
      });
    } catch (error) {
      this.logger.warn(`Redis non initialisé : ${(error as Error).message}`);
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.disponible) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.client || !this.disponible) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Un cache en échec ne doit jamais faire échouer la requête métier.
    }
  }

  /** Lit le cache, sinon exécute `producer` et mémorise le résultat. */
  async remember<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await producer();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Invalide un préfixe de clés. Appelé après chaque import, synchronisation
   * ou modification de dépistage pour que les chiffres publics soient justes.
   */
  async invalidate(prefix: string): Promise<number> {
    if (!this.client || !this.disponible) return 0;
    try {
      let cursor = '0';
      let supprimees = 0;
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          200,
        );
        cursor = next;
        if (keys.length > 0) {
          await this.client.del(...keys);
          supprimees += keys.length;
        }
      } while (cursor !== '0');
      return supprimees;
    } catch {
      return 0;
    }
  }

  isDisponible(): boolean {
    return this.disponible;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }
}
