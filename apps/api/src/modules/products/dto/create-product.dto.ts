import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client';

export class CreateProductDto {
  @ApiPropertyOptional({
    example: 'ANI-ORO-DOR-00001',
    description:
      'SKU auto-generado a partir de tipo, material, color y forma + secuencia de 5 dígitos. Si no se envía, se genera en el servidor.',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'Vestido de Gala Escarlata' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Vestido largo de seda con acabado brillante' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-de-tipo-de-joya' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de joya es requerido' })
  categoryId: string;

  @ApiProperty({ example: 'uuid-de-material', description: 'Material (requerido)' })
  @IsString()
  @IsNotEmpty({ message: 'El material es requerido' })
  materialId: string;

  @ApiProperty({ example: 'uuid-de-color', description: 'Color (requerido)' })
  @IsString()
  @IsNotEmpty({ message: 'El color es requerido' })
  colorId: string;

  @ApiPropertyOptional({
    example: 'uuid-de-forma',
    description: 'Forma (opcional)',
  })
  @IsOptional()
  @IsString()
  shapeId?: string;

  @ApiProperty({ example: 45.0 })
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo debe ser un número' })
  @IsPositive({ message: 'El costo debe ser mayor a 0' })
  costPrice: number;

  @ApiProperty({ example: 89.99 })
  @Type(() => Number)
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  salePrice: number;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMin?: number;

  @ApiPropertyOptional({ example: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMax?: number;

  @ApiPropertyOptional({ enum: ProductStatus, default: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 10, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialStock?: number;
}
