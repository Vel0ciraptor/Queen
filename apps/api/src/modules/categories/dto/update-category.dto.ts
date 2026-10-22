import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryDimension } from '@prisma/client';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Anillos de Compromiso' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: CategoryDimension, example: CategoryDimension.TYPE })
  @IsOptional()
  @IsEnum(CategoryDimension, { message: 'La dimensión no es válida' })
  dimension?: CategoryDimension;

  @ApiPropertyOptional({
    example: 'uuid-de-categoria-padre',
    description: 'Nuevo padre (mover a otra rama). null lo hace raíz.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 'Colección de compromiso' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
