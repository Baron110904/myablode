import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { PaginatedResult, PaginationDto, paginate } from 'src/common/dto/pagination.dto';
import { User, UserRole } from 'src/database/entities';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findAll(
    pagination: PaginationDto,
    recherche?: string,
  ): Promise<PaginatedResult<User>> {
    const builder = this.repository
      .createQueryBuilder('user')
      .orderBy('user.created_at', 'DESC')
      .skip(pagination.skip)
      .take(pagination.limit);

    if (recherche?.trim()) {
      builder.where(
        '(user.email ILIKE :terme OR user.nom ILIKE :terme OR user.prenom ILIKE :terme)',
        { terme: `%${recherche.trim()}%` },
      );
    }

    const [items, total] = await builder.getManyAndCount();
    return paginate(items, total, pagination);
  }

  /** Recherche par adresse, pour savoir si un compte existe déjà. */
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Utilisateur ${id} introuvable.`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<{ user: User; motDePasseTemporaire?: string }> {
    const email = dto.email.toLowerCase().trim();
    const existant = await this.repository.findOne({ where: { email } });
    if (existant) {
      throw new ConflictException(`Un compte existe déjà pour ${email}.`);
    }

    // Sans mot de passe fourni, on en génère un à transmettre hors ligne.
    const motDePasse = dto.password || genererMotDePasse();
    const user = await this.repository.save(
      this.repository.create({
        email,
        password_hash: await bcrypt.hash(motDePasse, 12),
        nom: dto.nom.trim(),
        prenom: dto.prenom.trim(),
        role: dto.role,
        active: dto.active ?? true,
      }),
    );

    return {
      user,
      motDePasseTemporaire: dto.password ? undefined : motDePasse,
    };
  }

  async update(id: number, dto: UpdateUserDto, auteurId: number): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const email = dto.email.toLowerCase().trim();
      const existant = await this.repository.findOne({ where: { email } });
      if (existant) {
        throw new ConflictException(`Un compte existe déjà pour ${email}.`);
      }
      user.email = email;
    }

    // Un super admin ne peut pas se rétrograder ni se désactiver lui-même :
    // ce serait le moyen le plus simple de verrouiller la plateforme.
    if (id === auteurId) {
      if (dto.role && dto.role !== user.role) {
        throw new ForbiddenException(
          'Vous ne pouvez pas modifier votre propre rôle.',
        );
      }
      if (dto.active === false) {
        throw new ForbiddenException(
          'Vous ne pouvez pas désactiver votre propre compte.',
        );
      }
    }

    if (dto.role && dto.role !== user.role) {
      await this.verifierDernierSuperAdmin(user, dto.role);
    }
    if (dto.active === false && user.role === UserRole.SUPER_ADMIN) {
      await this.verifierDernierSuperAdmin(user, null);
    }

    if (dto.nom !== undefined) user.nom = dto.nom.trim();
    if (dto.prenom !== undefined) user.prenom = dto.prenom.trim();
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.active !== undefined) {
      user.active = dto.active;
      // Désactiver un compte doit couper ses sessions ouvertes.
      if (!dto.active) user.refresh_token_hash = null;
    }

    return this.repository.save(user);
  }

  async remove(id: number, auteurId: number): Promise<void> {
    if (id === auteurId) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer votre propre compte.');
    }
    const user = await this.findOne(id);
    await this.verifierDernierSuperAdmin(user, null);
    await this.repository.remove(user);
  }

  /** Réinitialise le mot de passe et renvoie la valeur temporaire générée. */
  async reinitialiserMotDePasse(id: number): Promise<string> {
    const user = await this.findOne(id);
    const motDePasse = genererMotDePasse();
    user.password_hash = await bcrypt.hash(motDePasse, 12);
    user.refresh_token_hash = null;
    await this.repository.save(user);
    return motDePasse;
  }

  async statistiques(): Promise<{
    total: number;
    actifs: number;
    parRole: Array<{ role: string; total: number }>;
  }> {
    const total = await this.repository.count();
    const actifs = await this.repository.count({ where: { active: true } });
    const parRole = await this.repository.query(
      `SELECT role, COUNT(*)::int AS total FROM users GROUP BY role`,
    );
    return { total, actifs, parRole };
  }

  /** Empêche la disparition du dernier super administrateur actif. */
  private async verifierDernierSuperAdmin(
    user: User,
    nouveauRole: UserRole | null,
  ): Promise<void> {
    if (user.role !== UserRole.SUPER_ADMIN) return;
    if (nouveauRole === UserRole.SUPER_ADMIN) return;

    const autres = await this.repository.count({
      where: { role: UserRole.SUPER_ADMIN, active: true },
    });
    if (autres <= 1) {
      throw new BadRequestException(
        'Impossible : ce compte est le dernier super administrateur actif. ' +
          'Créez-en un autre avant de modifier celui-ci.',
      );
    }
  }
}

/** Mot de passe temporaire conforme à la politique (majuscule, minuscule, chiffre). */
function genererMotDePasse(): string {
  const minuscules = 'abcdefghijkmnopqrstuvwxyz';
  const majuscules = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const chiffres = '23456789';
  const alphabet = minuscules + majuscules + chiffres;

  const octets = randomBytes(16);
  let motDePasse =
    majuscules[octets[0] % majuscules.length] +
    minuscules[octets[1] % minuscules.length] +
    chiffres[octets[2] % chiffres.length];

  for (let i = 3; i < 12; i += 1) {
    motDePasse += alphabet[octets[i] % alphabet.length];
  }
  return motDePasse;
}
