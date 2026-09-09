import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from 'src/common/decorators';
import { User } from 'src/database/entities';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  /**
   * Relit l'utilisateur à chaque requête : un compte désactivé perd l'accès
   * immédiatement, sans attendre l'expiration de son jeton.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: ['id', 'email', 'role', 'nom', 'prenom', 'active'],
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Session invalide ou compte désactivé.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    };
  }
}
