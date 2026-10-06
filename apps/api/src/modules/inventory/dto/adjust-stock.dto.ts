import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AdjustStockDto {
  @ApiProperty({ example: 25 })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'El nuevo stock no puede ser negativo' })
  newStock: number;

  @ApiProperty({ example: 'Ajuste por conteo físico de inventario' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del ajuste es requerido' })
  reason: string;
}
