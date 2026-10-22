import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CompleteOrderDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.EFECTIVO,
    description: 'Método de pago con el que el cliente paga el total',
  })
  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  @IsNotEmpty({ message: 'El método de pago es requerido' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TRANS-998877' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}
