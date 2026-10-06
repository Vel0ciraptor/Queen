import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Role } from '../../common/decorators/roles.decorator';

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  @ApiOperation({ summary: 'Create income or expense transaction' })
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.financeService.create(createTransactionDto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List and filter financial transactions' })
  findAll(@Query() query: QueryFinanceDto) {
    return this.financeService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get financial balance, margins and revenue breakdown' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getSummary(startDate, endDate);
  }

  @Get('monthly-trend')
  @ApiOperation({ summary: 'Get monthly financial trend for charting' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  getMonthlyTrend(@Query('year') year?: number) {
    return this.financeService.getMonthlyTrend(year ? Number(year) : undefined);
  }

  @Delete('transactions/:id')
  @ApiOperation({ summary: 'Delete a financial transaction' })
  remove(@Param('id') id: string) {
    return this.financeService.remove(id);
  }
}
