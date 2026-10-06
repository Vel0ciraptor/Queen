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
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new sale (POS)' })
  create(@Body() createSaleDto: CreateSaleDto, @CurrentUser() user: any) {
    return this.salesService.create(createSaleDto, user.userId || user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List sales with filters (PROMOTORA sees only her sales)' })
  findAll(@Query() query: QuerySalesDto, @CurrentUser() user: any) {
    if (user?.role && user.role !== Role.ADMIN) {
      return this.salesService.findAll({ ...query, userId: user.sub });
    }
    return this.salesService.findAll(query);
  }

  @Get('today-summary')
  @ApiOperation({ summary: 'Get POS summary for current day' })
  getTodaySummary(@CurrentUser() user: any) {
    if (user?.role && user.role !== Role.ADMIN) {
      return this.salesService.getTodaySummary(user.sub);
    }
    return this.salesService.getTodaySummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale details by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.salesService.findOne(id, user?.role !== Role.ADMIN ? user.sub : undefined);
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel sale and restore stock (Admin only)' })
  cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.salesService.cancelSale(id, user.userId || user.id, reason);
  }
}
