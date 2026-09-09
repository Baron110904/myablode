import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { authenticator } from 'otplib';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/database/entities';
import { LoginDto } from './dto/auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionUser {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: UserRole;
  twofa_enabled: boolean;
  last_login: Date | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Vérifie les identifiants. Le message d'erreur reste identique que
   * l'email soit inconnu ou le mot de passe faux : ne pas révéler quels
   * comptes existent (énumération d'utilisateurs, OWASP A07).
   */
  async validerIdentifiants(dto: LoginDto): Promise<User> {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    const erreur = new UnauthorizedException('Email ou mot de passe incorrect.');
    if (!user) {
      // Hachage à vide : le temps de réponse ne trahit pas l'existence du compte.
      await bcrypt.compare(dto.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin');
      throw erreur;
    }

    const motDePasseValide = await bcrypt.compare(dto.password, user.password_hash);
    if (!motDePasseValide) throw erreur;

    if (!user.active) {
      throw new UnauthorizedException(
        'Ce compte est désactivé. Contactez un super administrateur.',
      );
    }

    if (user.twofa_enabled) {
      if (!dto.twofaCode) {
        throw new UnauthorizedException('CODE_2FA_REQUIS');
      }
      const codeValide = authenticator.check(dto.twofaCode, user.twofa_secret ?? '');
      if (!codeValide) {
        throw new UnauthorizedException('Code de double authentification invalide.');
      }
    }

    return user;
  }

  async emettreTokens(user: User): Promise<TokenPair> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessTtl'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshTtl'),
    });

    await this.users.update(user.id, {
      refresh_token_hash: hacher(refreshToken),
      last_login: new Date(),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Rotation du refresh token : chaque rafraîchissement invalide le
   * précédent. Un jeton volé devient inutilisable dès que le titulaire
   * légitime rafraîchit sa session.
   */
  async rafraichir(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expirée, reconnectez-vous.');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.active || !user.refresh_token_hash) {
      throw new UnauthorizedException('Session invalide.');
    }
    if (user.refresh_token_hash !== hacher(refreshToken)) {
      // Jeton révoqué ou déjà utilisé : on coupe toutes les sessions.
      await this.users.update(user.id, { refresh_token_hash: null });
      throw new UnauthorizedException('Session invalide, reconnectez-vous.');
    }

    return this.emettreTokens(user);
  }

  async deconnecter(userId: number): Promise<void> {
    await this.users.update(userId, { refresh_token_hash: null });
  }

  async profil(userId: number): Promise<SessionUser> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      twofa_enabled: user.twofa_enabled,
      last_login: user.last_login,
    };
  }

  async changerMotDePasse(
    userId: number,
    actuel: string,
    nouveau: string,
  ): Promise<void> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const valide = await bcrypt.compare(actuel, user.password_hash);
    if (!valide) {
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }
    await this.users.update(userId, {
      password_hash: await bcrypt.hash(nouveau, 12),
      refresh_token_hash: null,
    });
  }

  /**
   * Génère un jeton de réinitialisation valable 1 heure. Renvoie toujours
   * un succès côté contrôleur, que l'email existe ou non.
   */
  async demanderReinitialisation(email: string): Promise<string | null> {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user || !user.active) return null;

    const token = randomBytes(32).toString('hex');
    await this.users.update(user.id, {
      reset_token_hash: hacher(token),
      reset_token_expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });
    return token;
  }

  async reinitialiserMotDePasse(token: string, nouveau: string): Promise<void> {
    const user = await this.users.findOne({
      where: { reset_token_hash: hacher(token) },
    });
    if (
      !user ||
      !user.reset_token_expires_at ||
      user.reset_token_expires_at.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Lien de réinitialisation invalide ou expiré. Refaites une demande.',
      );
    }

    await this.users.update(user.id, {
      password_hash: await bcrypt.hash(nouveau, 12),
      reset_token_hash: null,
      reset_token_expires_at: null,
      refresh_token_hash: null,
    });
  }

  /** Prépare l'activation 2FA : renvoie le secret et l'URI otpauth (QR code). */
  async preparerDoubleAuthentification(
    userId: number,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    await this.users.update(userId, { twofa_secret: secret });
    return {
      secret,
      otpauthUrl: authenticator.keyuri(user.email, 'MyABLODE', secret),
    };
  }

  async activerDoubleAuthentification(userId: number, code: string): Promise<void> {
    const user = await this.users.findOneOrFail({ where: { id: userId } });
    if (!user.twofa_secret || !authenticator.check(code, user.twofa_secret)) {
      throw new BadRequestException('Code invalide, la double authentification n’est pas activée.');
    }
    await this.users.update(userId, { twofa_enabled: true });
  }

  async desactiverDoubleAuthentification(userId: number): Promise<void> {
    await this.users.update(userId, { twofa_enabled: false, twofa_secret: null });
  }
}

/** SHA-256 : les jetons sont aléatoires, un hachage lent est inutile ici. */
function hacher(valeur: string): string {
  return createHash('sha256').update(valeur).digest('hex');
}
