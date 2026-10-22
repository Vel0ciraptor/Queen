import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SetCountItemDto {
  @ApiProperty({
    example: 3,
    description: 'Unidades físicamente contadas de ese producto',
  })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad contada debe ser un número entero' })
  @Min(0, { message: 'La cantidad contada no puede ser negativa' })
  @IsNotEmpty()
  counted: number;
}
