import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SaleStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKpis() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      todaySales,
      monthSales,
      pendingOrders,
      lowStockCount,
      outOfStockCount,
      totalCustomers,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          createdAt: { gte: todayStart },
          status: SaleStatus.COMPLETED,
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          createdAt: { gte: monthStart },
          status: SaleStatus.COMPLETED,
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.order.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.inventory.count({
        where: {
          product: { status: 'ACTIVE' },
          stock: { gt: 0, lte: 5 },
        },
      }),
      this.prisma.inventory.count({
        where: {
          product: { status: 'ACTIVE' },
          stock: { lte: 0 },
        },
      }),
      this.prisma.customer.count(),
    ]);

    return {
      todaySalesAmount: Number(todaySales._sum.total || 0),
      todaySalesCount: todaySales._count.id,
      monthSalesAmount: Number(monthSales._sum.total || 0),
      monthSalesCount: monthSales._count.id,
      pendingOrdersCount: pendingOrders,
      lowStockCount,
      outOfStockCount,
      totalCustomers,
    };
  }

  async getTopSellingProducts(limit = 5) {
    const topItems = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topItems.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        images: true,
        inventory: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topItems.map((item) => ({
      product: productMap.get(item.productId),
      totalQuantitySold: item._sum.quantity || 0,
      totalRevenue: Number(item._sum.subtotal || 0),
    }));
  }

  async getSalesByPaymentMethod() {
    const sales = await this.prisma.sale.groupBy({
      by: ['paymentMethod'],
      where: { status: SaleStatus.COMPLETED },
      _sum: { total: true },
      _count: { id: true },
    });

    return sales.map((s) => ({
      method: s.paymentMethod,
      totalAmount: Number(s._sum.total || 0),
      transactionCount: s._count.id,
    }));
  }

  async getPromoterPerformance() {
    const promoters = await this.prisma.user.findMany({
      where: { isActive: true },
      include: {
        sales: {
          where: { status: SaleStatus.COMPLETED },
          select: { total: true, createdAt: true },
        },
      },
    });

    return promoters.map((u) => {
      const totalAmount = u.sales.reduce((sum, s) => sum + Number(s.total), 0);
      return {
        userId: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        salesCount: u.sales.length,
        totalSalesAmount: totalAmount,
      };
    });
  }

  async getInventoryValuation() {
    const products = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      include: {
        inventory: true,
      },
    });

    let totalCostValuation = 0;
    let totalSaleValuation = 0;
    let totalUnits = 0;

    for (const p of products) {
      const stock = p.inventory?.stock ?? 0;
      totalUnits += stock;
      totalCostValuation += Number(p.costPrice) * stock;
      totalSaleValuation += Number(p.salePrice) * stock;
    }

    const estimatedPotentialProfit = totalSaleValuation - totalCostValuation;

    return {
      totalActiveProducts: products.length,
      totalUnitsInStock: totalUnits,
      totalCostValuation,
      totalSaleValuation,
      estimatedPotentialProfit,
    };
  }
}
