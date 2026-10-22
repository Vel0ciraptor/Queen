import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockLocation } from '@prisma/client';

export class TransferTicketItemDto {
  @ApiProperty({ example: 'uuid-de-producto' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  quantity: number;
}

export class TransferTicketDto {
  @ApiProperty({ enum: StockLocation, example: StockLocation.BODEGA })
  @IsEnum(StockLocation, { message: 'Ubicación de origen inválida' })
  @IsNotEmpty({ message: 'La ubicación de origen es requerida' })
  fromLocation: StockLocation;

  @ApiProperty({ enum: StockLocation, example: StockLocation.TIENDA })
  @IsEnum(StockLocation, { message: 'Ubicación de destino inválida' })
  @IsNotEmpty({ message: 'La ubicación de destino es requerida' })
  toLocation: StockLocation;

  @ApiProperty({ type: [TransferTicketItemDto] })
  @IsArray()
  @ArrayNotEmpty({ message: 'El ticket debe incluir al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => TransferTicketItemDto)
  items: TransferTicketItemDto[];

  @ApiPropertyOptional({ example: 'TRASP-20261022-A1B2', description: 'N° de ticket (auto si se omite)' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: 'Reposición semanal de tienda' })
  @IsOptional()
  @IsString()
  notes?: string;
}
