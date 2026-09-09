import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/database/entities';
import { AuthenticatedUser, IS_PUBLIC_KEY, ROLES_KEY } from '../decorators';

/**
 * Applique la matrice de permissions de la section 3.2.6 :
 * super_admin (tout) · admin (données et contenus) · viewer (lecture seule).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest()
      .user as AuthenticatedUser | undefined;
    if (!user) return false;

    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Action réservée aux rôles : ${required.join(', ')}.`,
      );
    }
    return true;
  }
}
