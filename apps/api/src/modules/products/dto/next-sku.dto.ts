import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NextSkuDto {
  @ApiProperty({ example: 'uuid-de-tipo-de-joya' })
  @IsString()
  @IsNotEmpty({ message: 'El tipo de joya es requerido' })
  categoryId: string;

  @ApiProperty({ example: 'uuid-de-material' })
  @IsString()
  @IsNotEmpty({ message: 'El material es requerido' })
  materialId: string;

  @ApiProperty({ example: 'uuid-de-color' })
  @IsString()
  @IsNotEmpty({ message: 'El color es requerido' })
  colorId: string;

  @ApiPropertyOptional({ example: 'uuid-de-forma', description: 'Forma (opcional)' })
  @IsOptional()
  @IsString()
  shapeId?: string;
}
