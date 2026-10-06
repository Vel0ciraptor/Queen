import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get Dashboard KPI summary (Admin only)' })
  getDashboardKpis() {
    return this.reportsService.getDashboardKpis();
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopSellingProducts(@Query('limit') limit?: number) {
    return this.reportsService.getTopSellingProducts(limit ? Number(limit) : undefined);
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get sales breakdown by payment method' })
  getSalesByPaymentMethod() {
    return this.reportsService.getSalesByPaymentMethod();
  }

  @Get('promoters')
  @ApiOperation({ summary: 'Get promoter sales performance' })
  getPromoterPerformance() {
    return this.reportsService.getPromoterPerformance();
  }

  @Get('inventory-valuation')
  @ApiOperation({ summary: 'Get inventory total valuation and profit potential' })
  getInventoryValuation() {
    return this.reportsService.getInventoryValuation();
  }
}
