import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryDimension } from '@prisma/client';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Anillos' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es requerido' })
  name: string;

  @ApiProperty({
    enum: CategoryDimension,
    example: CategoryDimension.TYPE,
    description: 'Dimensión a la que pertenece: Tipo, Material, Color o Forma',
  })
  @IsEnum(CategoryDimension, { message: 'La dimensión no es válida' })
  @IsNotEmpty({ message: 'La dimensión es requerida' })
  dimension: CategoryDimension;

  @ApiPropertyOptional({
    example: 'uuid-de-categoria-padre',
    description: 'Categoría padre (para subcategorías). Debe ser de la misma dimensión.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 'Anillos de fantasía y compromiso' })
  @IsOptional()
  @IsString()
  description?: string;
}
