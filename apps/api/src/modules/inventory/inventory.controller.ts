import {
  Controller,
  Get,
  Post,
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
