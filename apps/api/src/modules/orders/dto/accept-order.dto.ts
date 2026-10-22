import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderFulfillmentType } from '@prisma/client';

export class AcceptOrderDto {
  @ApiProperty({
    enum: OrderFulfillmentType,
    example: OrderFulfillmentType.PICKUP,
    description: 'Recoge en tienda (PICKUP) o entrega a domicilio (DELIVERY)',
  })
  @IsEnum(OrderFulfillmentType, { message: 'Tipo de entrega inválido' })
  @IsNotEmpty({ message: 'El tipo de entrega es requerido' })
  fulfillmentType: OrderFulfillmentType;

  @ApiPropertyOptional({ example: 'Av. Libertador, Edif. Centro, piso 4' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Coordinar entrega por la tarde' })
  @IsOptional()
  @IsString()
  notes?: string;
}
