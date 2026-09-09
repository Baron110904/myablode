import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthenticatedUser, CurrentUser, Public } from 'src/common/decorators';
import { AuditService } from 'src/modules/audit/audit.service';
import { MailService } from 'src/modules/mail/mail.service';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  VerifyTwoFactorDto,
} from './dto/auth.dto';

const REFRESH_COOKIE = 'ablode_refresh';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  // 10 tentatives par minute : freine le bourrage d'identifiants sans gêner
  // un administrateur qui se trompe de mot de passe.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Connexion administrateur (US-ADM-01)' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validerIdentifiants(dto);
    const { accessToken, refreshToken } = await this.authService.emettreTokens(user);

    response.cookie(REFRESH_COOKIE, refreshToken, this.cookieOptions());
    await this.audit.log({
      userId: user.id,
      action: 'login',
      entity: 'user',
      entityId: user.id,
      request,
    });

    return {
      accessToken,
      user: await this.authService.profil(user.id),
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouvelle le jeton d’accès à partir du cookie HttpOnly' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Aucune session active.');
    }
    const paire = await this.authService.rafraichir(token);
    response.cookie(REFRESH_COOKIE, paire.refreshToken, this.cookieOptions());
    return { accessToken: paire.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion et invalidation des jetons' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.deconnecter(user.id);
    response.clearCookie(REFRESH_COOKIE, { ...this.cookieOptions(), maxAge: undefined });
    await this.audit.log({
      userId: user.id,
      action: 'logout',
      entity: 'user',
      entityId: user.id,
      request,
    });
    return { message: 'Déconnexion effectuée.' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l’utilisateur connecté' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.profil(user.id);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ApiOperation({ summary: 'Demande de réinitialisation par email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const token = await this.authService.demanderReinitialisation(dto.email);
    if (token) {
      await this.mail.envoyerReinitialisationMotDePasse(dto.email, token);
    }
    // Réponse identique dans tous les cas : ne pas divulguer les comptes existants.
    return {
      message:
        'Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Définit un nouveau mot de passe à partir du jeton reçu' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.reinitialiserMotDePasse(dto.token, dto.password);
    return { message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Changement de mot de passe par l’utilisateur connecté' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
  ) {
    await this.authService.changerMotDePasse(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    await this.audit.log({
      userId: user.id,
      action: 'change_password',
      entity: 'user',
      entityId: user.id,
      request,
    });
    return { message: 'Mot de passe modifié. Reconnectez-vous.' };
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Génère le secret 2FA et l’URI otpauth' })
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.preparerDoubleAuthentification(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Active la 2FA après vérification du code' })
  async enableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyTwoFactorDto,
    @Req() request: Request,
  ) {
    await this.authService.activerDoubleAuthentification(user.id, dto.code);
    await this.audit.log({
      userId: user.id,
      action: 'enable_2fa',
      entity: 'user',
      entityId: user.id,
      request,
    });
    return { message: 'Double authentification activée.' };
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Désactive la 2FA' })
  async disableTwoFactor(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    await this.authService.desactiverDoubleAuthentification(user.id);
    await this.audit.log({
      userId: user.id,
      action: 'disable_2fa',
      entity: 'user',
      entityId: user.id,
      request,
    });
    return { message: 'Double authentification désactivée.' };
  }

  /**
   * Réglages du cookie de session.
   *
   * `sameSite` vient de la configuration : `lax` tant que le site et l'API
   * partagent le domaine, `none` dès qu'ils sont hébergés séparément — sans
   * quoi le navigateur retient le cookie et l'administrateur se retrouve
   * déconnecté au premier rechargement, sans erreur affichée.
   *
   * `none` sans `secure` est refusé par tous les navigateurs actuels : la
   * combinaison est donc forcée ici plutôt que laissée à la vigilance de
   * celui qui remplit le fichier d'environnement.
   */
  private cookieOptions(): CookieOptions {
    const sameSite = this.config.get<'lax' | 'strict' | 'none'>('cookie.sameSite') ?? 'lax';
    const secure = (this.config.get<boolean>('cookie.secure') ?? false) || sameSite === 'none';

    return {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
