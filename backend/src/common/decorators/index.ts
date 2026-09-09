import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { UserRole } from 'src/database/entities';

export const IS_PUBLIC_KEY = 'isPublic';
/** Ouvre une route au site vitrine, sans jeton d'accès. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restreint une route à certains rôles (contrôlé par RolesGuard). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: UserRole;
  nom: string;
  prenom: string;
}

/** Injecte l'utilisateur résolu par la stratégie JWT. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);
