import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { CheckOrderItemDto } from './dto/check-order-item.dto';
import { CompleteOrderDto } from './dto/complete-order.dto';
import {
  MovementType,
  NotificationType,
  OrderFulfillmentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  SaleStatus,
  StockLocation,
  TransactionType,
} from '@prisma/client';
import {
  STOCK_LOCATION_LABELS,
  STOCK_LOCATION_SHORT,
  applyStockDelta,
  getStockByLocation,
  transferStockLocation,
} from '../../common/utils/stock-location.util';

/** Prioridad desde la que se reserva stock para pedidos web. */
const RESERVE_SOURCES: StockLocation[] = [
  StockLocation.BODEGA,
  StockLocation.TIENDA,
  StockLocation.LIVE,
];

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
      fulfillmentType,
      items,
    } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('El pedido debe tener al menos un producto');
    }

    // Tipo de entrega: explícito o deducido de la dirección.
    const effectiveFulfillment =
      fulfillmentType ??
      (deliveryAddress && deliveryAddress.trim() !== ''
        ? OrderFulfillmentType.DELIVERY
        : OrderFulfillmentType.PICKUP);

    if (
      effectiveFulfillment === OrderFulfillmentType.DELIVERY &&
      (!deliveryAddress || deliveryAddress.trim() === '')
    ) {
      throw new BadRequestException(
        'La dirección es requerida cuando la entrega es a domicilio (delivery)',
      );
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

      // 3. Create Order (sin descuento de stock: se reserva al aceptar)
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          status: OrderStatus.PENDING,
          fulfillmentType: effectiveFulfillment,
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
          sale: { select: { id: true } },
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
        sale: { select: { id: true, total: true, createdAt: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con ID ${id} no encontrado`);
    }

    return order;
  }

  /**
   * Acepta el pedido web y RESERVA su stock moviéndolo al canal Online
   * (Bodega → Tienda → Live → Online como fuentes). Total sin cambios.
   */
  async accept(id: string, acceptOrderDto: AcceptOrderDto, userId?: string) {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Solo los pedidos recibidos pueden aceptarse');
    }

    const { fulfillmentType, address, notes } = acceptOrderDto;
    const effectiveAddress = address ?? order.address;

    if (
      fulfillmentType === OrderFulfillmentType.DELIVERY &&
      (!effectiveAddress || effectiveAddress.trim() === '')
    ) {
      throw new BadRequestException(
        'La dirección es requerida cuando la entrega es a domicilio (delivery)',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw new BadRequestException(
            `El producto "${item.product.name}" no tiene inventario registrado`,
          );
        }

        if (inventory.stock < item.quantity) {
          throw new BadRequestException(
            `No hay stock suficiente para reservar "${item.product.name}". Disponible: ${inventory.stock}, Solicitado: ${item.quantity}`,
          );
        }

        const byLoc = await getStockByLocation(tx, inventory);
        let remaining = item.quantity;
        const sources: string[] = [];

        for (const loc of RESERVE_SOURCES) {
          if (remaining <= 0) break;
          const available = byLoc[loc] ?? 0;
          if (available <= 0) continue;
          const take = Math.min(available, remaining);
          await transferStockLocation(tx, inventory, loc, StockLocation.ONLINE, take);
          byLoc[loc] = available - take;
          byLoc[StockLocation.ONLINE] = (byLoc[StockLocation.ONLINE] ?? 0) + take;
          remaining -= take;
          sources.push(`${take} de ${STOCK_LOCATION_SHORT[loc]}`);
        }

        // Lo que ya está en Online se cuenta como reservado (sin trasladar).
        if (remaining > 0) {
          const onlineAvail = byLoc[StockLocation.ONLINE] ?? 0;
          const take = Math.min(onlineAvail, remaining);
          remaining -= take;
          if (take > 0) sources.push(`${take} ya en Online`);
        }

        if (remaining > 0) {
          throw new BadRequestException(
            `No hay stock suficiente para reservar "${item.product.name}". Disponible: ${inventory.stock}, Solicitado: ${item.quantity}`,
          );
        }

        if (sources.length > 0) {
          await tx.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: MovementType.TRANSFER,
              quantity: item.quantity,
              fromLocation: StockLocation.BODEGA,
              location: StockLocation.ONLINE,
              reference: `Pedido #${order.id.slice(0, 8)}`,
              notes: `Reserva de pedido web (${sources.join(', ')})`,
              createdBy: userId,
            },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CONFIRMED,
          fulfillmentType,
          address: fulfillmentType === OrderFulfillmentType.DELIVERY ? effectiveAddress : order.address,
          notes: notes
            ? `${order.notes || ''} | ${notes}`.replace(/^\s*\|\s*/, '')
            : order.notes,
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
          sale: { select: { id: true } },
        },
      });
    });
  }

  /** Marca/desmarca un producto del checklist de un pedido aceptado. */
  async checkItem(orderId: string, itemId: string, dto: CheckOrderItemDto, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Pedido con ID ${orderId} no encontrado`);
    }

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Primero acepta el pedido para trabajar el checklist');
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('El producto no pertenece a este pedido');
    }

    await this.prisma.orderItem.update({
      where: { id: item.id },
      data: dto.checked
        ? { checkedAt: new Date(), checkedBy: userId ?? null }
        : { checkedAt: null, checkedBy: null },
    });

    return this.findOne(orderId);
  }

  /**
   * Realiza la venta: exige checklist completo y registra la venta,
   * el pago y el descuento de inventario (solo al pagar el total).
   */
  async complete(id: string, completeOrderDto: CompleteOrderDto, userId?: string) {
    const order = await this.findOne(id);

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException('Solo los pedidos aceptados pueden convertirse en venta');
    }

    const unchecked = order.items.filter((i) => !i.checkedAt);
    if (unchecked.length > 0) {
      throw new BadRequestException(
        `Falta completar el checklist: ${unchecked.length} producto(s) sin verificar`,
      );
    }

    if (
      order.fulfillmentType === OrderFulfillmentType.DELIVERY &&
      (!order.address || order.address.trim() === '')
    ) {
      throw new BadRequestException('El pedido de delivery no tiene dirección registrada');
    }

    const { paymentMethod, paymentReference } = completeOrderDto;

    if (!userId) {
      throw new BadRequestException('Debe iniciar sesión para realizar la venta');
    }

    const fulfillmentLabel =
      order.fulfillmentType === OrderFulfillmentType.DELIVERY ? 'Delivery' : 'Retiro en tienda';

    return this.prisma.$transaction(async (tx) => {
      // 1. Preparar items de la venta
      let subtotal = 0;
      const prepared: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        unitCost: number;
        subtotal: number;
        inventoryId: string | null;
        stock: number;
        stockMin: number;
        productName: string;
      }> = [];

      for (const item of order.items) {
        const product = item.product;
        const inventory = product.inventory;

        if (!inventory || inventory.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para "${product.name}". Disponible: ${inventory?.stock ?? 0}, Solicitado: ${item.quantity}`,
          );
        }

        const unitPrice = Number(item.unitPrice);
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        prepared.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          unitCost: Number(product.costPrice),
          subtotal: itemSubtotal,
          inventoryId: inventory.id,
          stock: inventory.stock,
          stockMin: product.stockMin ?? 0,
          productName: product.name,
        });
      }

      const total = Number(order.total);

      // 2. Crear la Venta vinculada
      const sale = await tx.sale.create({
        data: {
          userId,
          customerId: order.customerId,
          status: SaleStatus.COMPLETED,
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(total),
          paymentMethod,
          notes: `Pedido web #${order.id.slice(0, 8)} · ${fulfillmentLabel}`,
          items: {
            create: prepared.map((p) => ({
              productId: p.productId,
              quantity: p.quantity,
              unitPrice: new Prisma.Decimal(p.unitPrice),
              unitCost: new Prisma.Decimal(p.unitCost),
              subtotal: new Prisma.Decimal(p.subtotal),
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: true,
        },
      });

      // 3. Descontar inventario (drena primero el canal Online reservado)
      for (const p of prepared) {
        const deltaResult = await applyStockDelta(
          tx,
          { id: p.inventoryId!, stock: p.stock },
          -p.quantity,
          {
            drainMode: 'channels-first',
            channelPriority: [
              StockLocation.ONLINE,
              StockLocation.TIENDA,
              StockLocation.LIVE,
            ],
          },
        );

        await tx.inventoryMovement.create({
          data: {
            inventoryId: p.inventoryId!,
            type: MovementType.SALE,
            quantity: p.quantity,
            fromLocation: deltaResult.origin ?? undefined,
            reference: `Pedido web #${order.id.slice(0, 8)}`,
            notes: `Venta web realizada (${fulfillmentLabel})`,
            createdBy: userId,
          },
        });

        const newStock = deltaResult.newStock;
        if (userId && newStock <= p.stockMin) {
          await tx.notification.create({
            data: {
              userId,
              type: newStock === 0 ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK,
              title: newStock === 0 ? '¡Producto agotado!' : '¡Stock bajo!',
              message: `El producto "${p.productName}" tiene ${newStock} unidades en stock.`,
              metadata: { productId: p.productId, newStock },
            },
          });
        }
      }

      // 4. Registrar pago (único, por el total)
      await tx.payment.create({
        data: {
          saleId: sale.id,
          orderId: order.id,
          method: paymentMethod,
          amount: new Prisma.Decimal(total),
          status: PaymentStatus.COMPLETED,
          reference: paymentReference || `ORDER-${order.id.slice(0, 8)}`,
        },
      });

      // 5. Ingreso financiero
      await tx.financialTransaction.create({
        data: {
          type: TransactionType.INCOME,
          amount: new Prisma.Decimal(total),
          description: `Ingreso por pedido web #${order.id.slice(0, 8)}`,
          category: 'Pedido Online',
          reference: order.id,
          date: new Date(),
        },
      });

      // 6. Marcar pedido como venta realizada
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED, saleId: sale.id },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
          sale: { select: { id: true, total: true, createdAt: true } },
        },
      });

      return { order: updated, sale };
    });
  }

  async updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto, userId?: string) {
    if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
      return this.cancel(id, updateOrderStatusDto.notes, userId);
    }

    throw new BadRequestException(
      'Usa las acciones de aceptar pedido, checklist o realizar venta para gestionar el pedido',
    );
  }

  /** Cancela un pedido; si estaba aceptado, libera la reserva (Online → Bodega). */
  async cancel(id: string, reason?: string, userId?: string) {
    const order = await this.findOne(id);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Este pedido ya fue cancelado');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'La venta ya fue realizada; para revertir, anula la venta desde la pestaña Ventas',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (order.status === OrderStatus.CONFIRMED) {
        // Liberar reserva: devuelve lo reservado en Online a la bodega.
        for (const item of order.items) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });
          if (!inventory) continue;

          const byLoc = await getStockByLocation(tx, inventory);
          const available = byLoc[StockLocation.ONLINE] ?? 0;
          const take = Math.min(available, item.quantity);
          if (take <= 0) continue;

          await transferStockLocation(tx, inventory, StockLocation.ONLINE, StockLocation.BODEGA, take);

          await tx.inventoryMovement.create({
            data: {
              inventoryId: inventory.id,
              type: MovementType.TRANSFER,
              quantity: take,
              fromLocation: StockLocation.ONLINE,
              location: StockLocation.BODEGA,
              reference: `Pedido #${order.id.slice(0, 8)}`,
              notes:
                take < item.quantity
                  ? `Reserva liberada por cancelación (${take} de ${item.quantity})`
                  : 'Reserva liberada por cancelación del pedido',
              createdBy: userId,
            },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          notes: order.notes
            ? `${order.notes} | Cancelada: ${reason || 'Sin motivo'}`
            : `Cancelada: ${reason || 'Sin motivo'}`,
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
          sale: { select: { id: true } },
        },
      });
    });
  }

  async getWhatsAppUrl(id: string, storePhone = '584120000000') {
    const order = await this.findOne(id);

    const itemsText = order.items
      .map((i) => `• ${i.quantity}x ${i.product.name} ($${Number(i.unitPrice).toFixed(2)})`)
      .join('\n');

    const fulfillmentText =
      order.fulfillmentType === OrderFulfillmentType.DELIVERY
        ? order.address || 'Delivery (dirección a confirmar)'
        : 'Retiro en tienda';

    const message = `✨ *Nuevo Pedido en Queen Style* ✨\n\n` +
      `*Pedido:* #${order.id.slice(0, 8)}\n` +
      `*Cliente:* ${order.customer?.name || 'Cliente'}\n` +
      `*Teléfono:* ${order.customer?.phone || 'N/A'}\n` +
      `*Entrega:* ${fulfillmentText}\n\n` +
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
