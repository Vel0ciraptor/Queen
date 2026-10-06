import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionType, example: TransactionType.EXPENSE })
  @IsEnum(TransactionType, { message: 'Tipo de transacción inválido' })
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ example: 150.0 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  amount: number;

  @ApiProperty({ example: 'Pago de alquiler local comercial' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @ApiPropertyOptional({ example: 'Alquiler' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'REC-0099' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
