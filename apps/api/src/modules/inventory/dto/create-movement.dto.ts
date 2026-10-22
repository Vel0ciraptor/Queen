import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MovementType, StockLocation } from '@prisma/client';

export class CreateMovementDto {
  @ApiProperty({ example: 'uuid-de-producto' })
  @IsString()
  @IsNotEmpty({ message: 'El ID del producto es requerido' })
  productId: string;

  @ApiProperty({ enum: MovementType, example: MovementType.PURCHASE })
  @IsEnum(MovementType, { message: 'Tipo de movimiento inválido' })
  type: MovementType;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @IsPositive({ message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @ApiPropertyOptional({
    enum: StockLocation,
    example: StockLocation.TIENDA,
    description:
      'Ubicación de destino (entrada de stock o destino del traspaso). BODEGA por defecto.',
  })
  @IsOptional()
  @IsEnum(StockLocation, { message: 'Ubicación de destino inválida' })
  location?: StockLocation;

  @ApiPropertyOptional({
    enum: StockLocation,
    example: StockLocation.BODEGA,
    description:
      'Ubicación de origen (traspaso desde esta ubicación, o canal desde el que sale el stock).',
  })
  @IsOptional()
  @IsEnum(StockLocation, { message: 'Ubicación de origen inválida' })
  fromLocation?: StockLocation;

  @ApiPropertyOptional({ example: 'FAC-2024-001' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Ingreso por compra de lote' })
  @IsOptional()
  @IsString()
  notes?: string;
}
