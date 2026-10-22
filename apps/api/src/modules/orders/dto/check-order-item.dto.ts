import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckOrderItemDto {
  @ApiProperty({ example: true, description: 'true = producto verificado/preparado' })
  @IsBoolean({ message: 'El valor del checklist debe ser verdadero o falso' })
  @IsNotEmpty()
  checked: boolean;
}
