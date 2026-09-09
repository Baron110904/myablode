import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

/** Politique de mot de passe (section 6.2) : 8 caractères, majuscule, minuscule, chiffre. */
export const REGEX_MOT_DE_PASSE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const MESSAGE_MOT_DE_PASSE =
  'Le mot de passe doit contenir au moins 8 caractères, dont une minuscule, une majuscule et un chiffre.';

export class LoginDto {
  @ApiProperty({ example: 'admin@ablode.bj' })
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;

  @ApiProperty({ example: 'Ablode2026!' })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire.' })
  password: string;

  @ApiPropertyOptional({ description: 'Code à 6 chiffres si la 2FA est activée' })
  @IsOptional()
  @IsString()
  twofaCode?: string;

  @ApiPropertyOptional({ description: 'Prolonge la session côté navigateur' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty()
  @Matches(REGEX_MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @Matches(REGEX_MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  newPassword: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code: string;
}
