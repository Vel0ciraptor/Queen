import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { CheckOrderItemDto } from './dto/check-order-item.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Público (catálogo online / tienda física) ──────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create new online catalog order (Public / Storefront)' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID (public confirmation page)' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  // ── Gestión (solo ADMIN: la promotora no ve las ventas web) ────────────────

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List and filter orders (Admin only)' })
  findAll(@Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id/whatsapp')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get WhatsApp link for order notification (Admin only)' })
  getWhatsAppUrl(@Param('id') id: string) {
    return this.ordersService.getWhatsAppUrl(id);
  }

  @Post(':id/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Accept order and reserve stock in Online channel (Admin only)' })
  accept(
    @Param('id') id: string,
    @Body() acceptOrderDto: AcceptOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.accept(id, acceptOrderDto, user?.id);
  }

  @Patch(':id/items/:itemId/check')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle product checklist item on an accepted order (Admin only)' })
  checkItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() checkOrderItemDto: CheckOrderItemDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.checkItem(id, itemId, checkOrderItemDto, user?.id);
  }

  @Post(':id/complete')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Realizar venta: cobra el total, crea la Venta y descuenta inventario (Admin only)',
  })
  complete(
    @Param('id') id: string,
    @Body() completeOrderDto: CompleteOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.complete(id, completeOrderDto, user?.id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel order and release reserved stock (Admin only)' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto, user?.id);
  }
}
