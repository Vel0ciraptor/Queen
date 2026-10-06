import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus, { message: 'Estado de pedido inválido' })
  @IsNotEmpty()
  status: OrderStatus;

  @ApiPropertyOptional({ example: 'Pedido preparado y listo para entrega' })
  @IsOptional()
  @IsString()
  notes?: string;
}
