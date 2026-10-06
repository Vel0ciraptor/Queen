import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Vestidos' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la categoría es requerido' })
  name: string;

  @ApiPropertyOptional({ example: 'Vestidos de gala y casuales' })
  @IsOptional()
  @IsString()
  description?: string;
}
