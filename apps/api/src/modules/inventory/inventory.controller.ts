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
import { InventoryService } from './inventory.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { CreateInventoryCountDto } from './dto/create-count.dto';
import { SetCountItemDto } from './dto/set-count-item.dto';
import { InventoryCountStatus } from '@prisma/client';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get general inventory overview and stats' })
  getOverview() {
    return this.inventoryService.getInventoryOverview();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get low stock alerts' })
  getLowStockAlerts() {
    return this.inventoryService.getLowStockAlerts();
  }

  @Get('movements')
  @ApiOperation({ summary: 'List and filter inventory movements' })
  getMovements(@Query() query: QueryMovementsDto) {
    return this.inventoryService.getMovements(query);
  }

  @Get('by-location')
  @ApiOperation({ summary: 'Products grouped by stock location (with low-stock flags)' })
  getProductsByLocation() {
    return this.inventoryService.getProductsByLocation();
  }

  @Post('transfer-ticket')
  @ApiOperation({ summary: 'Create a multi-product transfer ticket between locations' })
  transferTicket(@Body() transferTicketDto: TransferTicketDto, @CurrentUser() user: any) {
    return this.inventoryService.transferTicket(transferTicketDto, user?.id);
  }

  // ── Conteos cíclicos (checklist físico + cuadre) ────────────────────────────

  @Post('counts')
  @ApiOperation({ summary: 'Start a physical inventory count (checklist) for a location' })
  createCount(@Body() createCountDto: CreateInventoryCountDto, @CurrentUser() user: any) {
    return this.inventoryService.createCount(createCountDto, user?.id);
  }

  @Get('counts')
  @ApiOperation({ summary: 'List inventory counts (history)' })
  listCounts(@Query() query: Record<string, string>) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const valid = Object.values(InventoryCountStatus);
    const status = valid.includes(query.status as InventoryCountStatus)
      ? (query.status as InventoryCountStatus)
      : undefined;
    return this.inventoryService.listCounts({ page, limit, status });
  }

  @Get('counts/stats')
  @ApiOperation({ summary: 'KPIs: does the inventory match? (matched vs counted)' })
  getCountsStats() {
    return this.inventoryService.getCountsStats();
  }

  @Get('counts/:id')
  @ApiOperation({ summary: 'Inventory count detail with checklist items' })
  getCount(@Param('id') id: string) {
    return this.inventoryService.getCount(id);
  }

  @Patch('counts/:id/items/:itemId')
  @ApiOperation({ summary: 'Set counted quantity for a product in the checklist' })
  setCountItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: SetCountItemDto) {
    return this.inventoryService.setCountItem(id, itemId, dto);
  }

  @Post('counts/:id/complete')
  @ApiOperation({ summary: 'Finish the count (all products must be counted)' })
  completeCount(@Param('id') id: string) {
    return this.inventoryService.completeCount(id);
  }

  @Patch('counts/:id/status')
  @ApiOperation({ summary: 'Cancel an scheduled or in-progress count' })
  cancelCount(@Param('id') id: string) {
    return this.inventoryService.cancelCount(id);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get inventory details for a product' })
  getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Post('movement')
  @ApiOperation({ summary: 'Register stock movement (purchase, loss, damage, etc.)' })
  registerMovement(
    @Body() createMovementDto: CreateMovementDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.registerMovement(createMovementDto, user?.id);
  }

  @Post(':productId/adjust')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Adjust stock manually (Admin only)' })
  adjustStock(
    @Param('productId') productId: string,
    @Body() adjustStockDto: AdjustStockDto,
    @CurrentUser() user: any,
  ) {
    return this.inventoryService.adjustStock(productId, adjustStockDto, user?.id);
  }
}
