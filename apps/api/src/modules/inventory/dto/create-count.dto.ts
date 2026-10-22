import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryCountFrequency, StockLocation } from '@prisma/client';

export class CreateInventoryCountDto {
  @ApiProperty({
    enum: StockLocation,
    example: StockLocation.TIENDA,
    description: 'Ubicación que se va a contar físicamente',
  })
  @IsEnum(StockLocation, { message: 'Ubicación inválida' })
  location: StockLocation;

  @ApiPropertyOptional({
    enum: InventoryCountFrequency,
    example: InventoryCountFrequency.WEEKLY,
    description: 'Cadencia del conteo: única vez, semanal o dos veces al mes',
  })
  @IsOptional()
  @IsEnum(InventoryCountFrequency, { message: 'Frecuencia inválida' })
  frequency?: InventoryCountFrequency;

  @ApiPropertyOptional({ example: 'Conteo semanal de tienda física' })
  @IsOptional()
  @IsString()
  notes?: string;
}
