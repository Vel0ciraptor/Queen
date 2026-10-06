import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import {
  MovementType,
  PaymentStatus,
  Prisma,
  SaleStatus,
  TransactionType,
  NotificationType,
} from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSaleDto: CreateSaleDto, userId: string) {
    const { customerId, items, paymentMethod, discount = 0, notes, paymentReference } = createSaleDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('La venta debe tener al menos un producto');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Validate products and stock
      let subtotal = 0;
      const preparedItems = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });

        if (!product || product.status !== 'ACTIVE') {
          throw new NotFoundException(`Producto con ID ${item.productId} no encontrado o inactivo`);
        }

        const currentStock = product.inventory?.stock ?? 0;
        if (currentStock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Stock actual: ${currentStock}, Solicitado: ${item.quantity}`,
          );
        }

        const unitPrice = item.unitPrice ?? Number(product.salePrice);
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        preparedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          unitCost: Number(product.costPrice),
          subtotal: itemSubtotal,
          inventoryId: product.inventory!.id,
          currentStock,
          stockMin: product.stockMin,
          productName: product.name,
        });
      }

      const total = Math.max(0, subtotal - discount);

      // 2. Create Sale
      const sale = await tx.sale.create({
        data: {
          userId,
          customerId: customerId || null,
          status: SaleStatus.COMPLETED,
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(discount),
          total: new Prisma.Decimal(total),
          paymentMethod,
          notes,
          items: {
            create: preparedItems.map((pi) => ({
              productId: pi.productId,
              quantity: pi.quantity,
              unitPrice: new Prisma.Decimal(pi.unitPrice),
              unitCost: new Prisma.Decimal(pi.unitCost),
              subtotal: new Prisma.Decimal(pi.subtotal),
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          customer: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 3. Update inventory & record movements & check stock alerts
      for (const pi of preparedItems) {
        const newStock = pi.currentStock - pi.quantity;

        await tx.inventory.update({
          where: { id: pi.inventoryId },
          data: { stock: newStock },
        });

        await tx.inventoryMovement.create({
          data: {
            inventoryId: pi.inventoryId,
            type: MovementType.SALE,
            quantity: pi.quantity,
            reference: `Venta #${sale.id.slice(0, 8)}`,
            notes: `Venta directa realizada por usuario`,
            createdBy: userId,
          },
        });

        // Check if low stock notification needed
        if (newStock <= pi.stockMin) {
          await tx.notification.create({
            data: {
              userId,
              type: newStock === 0 ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK,
              title: newStock === 0 ? '¡Producto agotado!' : '¡Stock bajo!',
              message: `El producto "${pi.productName}" tiene ${newStock} unidades en stock.`,
              metadata: { productId: pi.productId, newStock },
            },
          });
        }
      }

      // 4. Create Payment record
      await tx.payment.create({
        data: {
          saleId: sale.id,
          method: paymentMethod,
          amount: new Prisma.Decimal(total),
          status: PaymentStatus.COMPLETED,
          reference: paymentReference || `SALE-${sale.id.slice(0, 8)}`,
        },
      });

      // 5. Record Financial Transaction (Income)
      await tx.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          amount: new Prisma.Decimal(total),
          description: `Ingreso por venta POS #${sale.id.slice(0, 8)}`,
          category: 'Venta Directa',
          reference: sale.id,
          date: new Date(),
        },
      });

      return sale;
    });
  }

  async findAll(query: QuerySalesDto) {
    const {
      userId,
      customerId,
      status,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.SaleWhereInput = {};

    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          customer: true,
          items: {
            include: { product: true },
          },
          payments: true,
        },
      }),
      this.prisma.sale.count({ where }),
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

  async findOne(id: string, userId?: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        customer: true,
        items: {
          include: {
            product: {
              include: { images: true, category: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    if (userId && sale.userId !== userId) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return sale;
  }

  async cancelSale(id: string, userId: string, reason?: string) {
    const sale = await this.findOne(id);

    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Esta venta ya ha sido cancelada previamente');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Restore stock
      for (const item of sale.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (inventory) {
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { stock: inventory.stock + item.quantity },
          });

          await tx.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: MovementType.RETURN,
              quantity: item.quantity,
              reference: `Cancelación Venta #${sale.id.slice(0, 8)}`,
              notes: reason || 'Devolución de stock por venta cancelada',
              createdBy: userId,
            },
          });
        }
      }

      // 2. Mark payments as refunded
      await tx.payment.updateMany({
        where: { saleId: id },
        data: { status: PaymentStatus.REFUNDED },
      });

      // 3. Record reversal transaction (Expense)
      await tx.financialTransaction.create({
        data: {
          type: TransactionType.EXPENSE,
          amount: sale.total,
          description: `Devolución por anulación de Venta #${sale.id.slice(0, 8)}`,
          category: 'Devolución',
          reference: sale.id,
          date: new Date(),
        },
      });

      // 4. Update sale status
      return tx.sale.update({
        where: { id },
        data: {
          status: SaleStatus.CANCELLED,
          notes: sale.notes ? `${sale.notes} | Cancelada: ${reason || 'Sin motivo'}` : `Cancelada: ${reason || 'Sin motivo'}`,
        },
        include: {
          items: true,
          customer: true,
          payments: true,
        },
      });
    });
  }

  async getTodaySummary(userId?: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const sales = await this.prisma.sale.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: SaleStatus.COMPLETED,
        ...(userId ? { userId } : {}),
      },
      include: {
        items: true,
      },
    });

    const totalSales = sales.reduce((acc, s) => acc + Number(s.total), 0);
    const totalTransactions = sales.length;
    const totalItemsSold = sales.reduce(
      (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );

    return {
      date: todayStart.toISOString().split('T')[0],
      totalSales,
      totalTransactions,
      totalItemsSold,
    };
  }
}
