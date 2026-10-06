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
  @ApiProperty({ example: 'SKU-VEST-001' })
  @IsString()
  @IsNotEmpty({ message: 'SKU es requerido' })
  sku: string;

  @ApiProperty({ example: 'Vestido de Gala Escarlata' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Vestido largo de seda con acabado brillante' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-de-categoria' })
  @IsString()
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoryId: string;

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
