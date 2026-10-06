import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryFinanceDto } from './dto/query-finance.dto';
import { Prisma, TransactionType } from '@prisma/client';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const { amount, date, ...rest } = createTransactionDto;

    return this.prisma.financialTransaction.create({
      data: {
        ...rest,
        amount: new Prisma.Decimal(amount),
        date: date ? new Date(date) : new Date(),
      },
    });
  }

  async findAll(query: QueryFinanceDto) {
    const { type, category, startDate, endDate, page = 1, limit = 20 } = query;

    const where: Prisma.FinancialTransactionWhereInput = {};

    if (type) where.type = type;
    if (category) where.category = category;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary(startDate?: string, endDate?: string) {
    const where: Prisma.FinancialTransactionWhereInput = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryBreakdown: Record<string, { income: number; expense: number }> = {};

    for (const t of transactions) {
      const amount = Number(t.amount);
      const cat = t.category || 'Sin Categoría';

      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { income: 0, expense: 0 };
      }

      if (t.type === TransactionType.INCOME) {
        totalIncome += amount;
        categoryBreakdown[cat].income += amount;
      } else {
        totalExpense += amount;
        categoryBreakdown[cat].expense += amount;
      }
    }

    const netProfit = totalIncome - totalExpense;
    const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      marginPercentage: Number(margin.toFixed(2)),
      transactionCount: transactions.length,
      categoryBreakdown,
    };
  }

  async getMonthlyTrend(year = new Date().getFullYear()) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'asc' },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i).toLocaleString('es-ES', { month: 'short' }),
      income: 0,
      expense: 0,
      net: 0,
    }));

    for (const t of transactions) {
      const monthIdx = new Date(t.date).getMonth();
      const amount = Number(t.amount);

      if (t.type === TransactionType.INCOME) {
        months[monthIdx].income += amount;
      } else {
        months[monthIdx].expense += amount;
      }
      months[monthIdx].net = months[monthIdx].income - months[monthIdx].expense;
    }

    return {
      year,
      months,
    };
  }

  async remove(id: string) {
    const transaction = await this.prisma.financialTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción con ID ${id} no encontrada`);
    }

    return this.prisma.financialTransaction.delete({
      where: { id },
    });
  }
}
