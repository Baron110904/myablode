import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { UserRole } from 'src/database/entities';
import {
  MESSAGE_MOT_DE_PASSE,
  REGEX_MOT_DE_PASSE,
} from 'src/modules/auth/dto/auth.dto';

export class CreateUserDto {
  @ApiProperty({ example: 'a.tossou@ablode.bj' })
  @IsEmail({}, { message: 'Adresse email invalide.' })
  email: string;

  @ApiPropertyOptional({
    description: 'Laisser vide pour générer un mot de passe temporaire',
  })
  @IsOptional()
  @Matches(REGEX_MOT_DE_PASSE, { message: MESSAGE_MOT_DE_PASSE })
  password?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(100)
  nom: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(100)
  prenom: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'Rôle invalide.' })
  role: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
