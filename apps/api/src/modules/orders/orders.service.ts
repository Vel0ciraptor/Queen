import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import {
  MovementType,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      notes,
      deliveryFee = 0,
      items,
    } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Find or create customer
      let customer = null;
      if (customerPhone) {
        customer = await tx.customer.findUnique({
          where: { phone: customerPhone },
        });
      }

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerName,
            phone: customerPhone || null,
            email: customerEmail || null,
            address: deliveryAddress || null,
          },
        });
      }

      // 2. Validate products and calculate prices
      let subtotal = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });

        if (!product || product.status !== 'ACTIVE') {
          throw new NotFoundException(`Producto ${item.productId} no encontrado o inactivo`);
        }

        const unitPrice = Number(product.salePrice);
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        orderItemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(unitPrice),
          subtotal: new Prisma.Decimal(itemSubtotal),
        });
      }

      const total = subtotal + deliveryFee;

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          status: OrderStatus.PENDING,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          total: new Prisma.Decimal(total),
          address: deliveryAddress,
          notes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
      });

      // 4. Create admin notification
      const adminUsers = await tx.user.findMany({
        where: { role: 'ADMIN', isActive: true },
      });

      for (const admin of adminUsers) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: NotificationType.NEW_ORDER,
            title: '¡Nuevo Pedido Online!',
            message: `Pedido #${order.id.slice(0, 8)} de ${customer.name} por $${total.toFixed(2)}`,
            metadata: { orderId: order.id, total },
          },
        });
      }

      return order;
    });
  }

  async findAll(query: QueryOrdersDto) {
    const { customerId, status, startDate, endDate, page = 1, limit = 20 } = query;

    const where: Prisma.OrderWhereInput = {};

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

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
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: { images: true },
              },
            },
          },
          payments: true,
        },
      }),
      this.prisma.order.count({ where }),
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

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: {
              include: { images: true, category: true, inventory: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }

    return order;
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto, userId?: string) {
    const order = await this.findOne(id);
    const prevStatus = order.status;
    const newStatus = updateOrderStatusDto.status;

    return this.prisma.$transaction(async (tx) => {
      // If moving to DELIVERED from non-delivered, deduct inventory and record sale income
      if (newStatus === OrderStatus.DELIVERED && prevStatus !== OrderStatus.DELIVERED) {
        for (const item of order.items) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (inventory) {
            const newStock = Math.max(0, inventory.stock - item.quantity);
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { stock: newStock },
            });

            await tx.inventoryMovement.create({
              data: {
                inventoryId: inventory.id,
                type: MovementType.SALE,
                quantity: item.quantity,
                reference: `Pedido #${order.id.slice(0, 8)}`,
                notes: 'Entrega de pedido online',
                createdBy: userId,
              },
            });
          }
        }

        // Record income
        await tx.financialTransaction.create({
          data: {
            type: TransactionType.INCOME,
            amount: order.total,
            description: `Ingreso por pedido online entregado #${order.id.slice(0, 8)}`,
            category: 'Pedido Online',
            reference: order.id,
            date: new Date(),
          },
        });

        // Record payment
        await tx.payment.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.OTRO,
            amount: order.total,
            status: PaymentStatus.COMPLETED,
            reference: `ORDER-${order.id.slice(0, 8)}`,
          },
        });
      }

      return tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          notes: updateOrderStatusDto.notes
            ? `${order.notes || ''} | ${updateOrderStatusDto.notes}`
            : order.notes,
        },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
          payments: true,
        },
      });
    });
  }

  async getWhatsAppUrl(id: string, storePhone = '584120000000') {
    const order = await this.findOne(id);

    const itemsText = order.items
      .map((i) => `• ${i.quantity}x ${i.product.name} ($${Number(i.unitPrice).toFixed(2)})`)
      .join('\n');

    const message = `✨ *Nuevo Pedido en Queen Style* ✨\n\n` +
      `*Pedido:* #${order.id.slice(0, 8)}\n` +
      `*Cliente:* ${order.customer?.name || 'Cliente'}\n` +
      `*Teléfono:* ${order.customer?.phone || 'N/A'}\n` +
      `*Dirección:* ${order.address || 'Retiro en tienda'}\n\n` +
      `*Productos:*\n${itemsText}\n\n` +
      `*Subtotal:* $${Number(order.subtotal).toFixed(2)}\n` +
      `*Envío:* $${Number(order.deliveryFee).toFixed(2)}\n` +
      `*Total a pagar:* *$${Number(order.total).toFixed(2)}*\n\n` +
      `_¡Gracias por tu compra en Queen Style!_`;

    const encoded = encodeURIComponent(message);
    const targetPhone = order.customer?.phone ? order.customer.phone.replace(/[^0-9]/g, '') : storePhone;

    return {
      whatsappUrl: `https://wa.me/${targetPhone}?text=${encoded}`,
      message,
    };
  }
}
