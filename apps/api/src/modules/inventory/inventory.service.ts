import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { CreateInventoryCountDto } from './dto/create-count.dto';
import { SetCountItemDto } from './dto/set-count-item.dto';
import {
  InventoryCountFrequency,
  InventoryCountStatus,
  MovementType,
  Prisma,
  StockLocation,
} from '@prisma/client';
import {
  ALL_LOCATIONS,
  CHANNEL_LOCATIONS,
  STOCK_LOCATION_LABELS,
  applyStockDelta,
  getStockByLocation,
  transferStockLocation,
} from '../../common/utils/stock-location.util';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventoryOverview() {
    const [inventories, movements, transfers] = await Promise.all([
      this.prisma.inventory.findMany({
        include: {
          locations: true,
          product: {
            include: { images: true, category: true },
          },
        },
      }),
      this.prisma.inventoryMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: {
            include: { product: true },
          },
        },
      }),
      this.prisma.inventoryMovement.findMany({
        where: { type: MovementType.TRANSFER },
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: {
            include: {
              product: { select: { id: true, name: true, sku: true, images: true } },
            },
          },
        },
      }),
    ]);

    const active = inventories.filter((inv) => inv.product?.status === 'ACTIVE');
    const lowThreshold = (stockMin: number) => (stockMin > 0 ? stockMin : 5);
    const lowStockProducts = active.filter(
      (inv) => inv.stock > 0 && inv.stock <= lowThreshold(inv.product.stockMin ?? 0),
    );
    const outOfStockProducts = active.filter((inv) => inv.stock <= 0);

    // Reparto por ubicación: canales explícitos + bodega derivada.
    const locationMap = new Map<
      StockLocation,
      { location: StockLocation; label: string; units: number; products: number }
    >();
    for (const loc of ALL_LOCATIONS) {
      locationMap.set(loc, { location: loc, label: STOCK_LOCATION_LABELS[loc], units: 0, products: 0 });
    }

    let totalUnits = 0;
    for (const inv of inventories) {
      totalUnits += inv.stock;
      let channelSum = 0;
      for (const row of inv.locations ?? []) {
        const qty = Number(row.quantity) || 0;
        if (qty <= 0) continue;
        channelSum += qty;
        const entry = locationMap.get(row.location);
        if (entry) {
          entry.units += qty;
          entry.products += 1;
        }
      }
      const bodega = Math.max(0, inv.stock - channelSum);
      if (bodega > 0) {
        const entry = locationMap.get(StockLocation.BODEGA);
        if (entry) {
          entry.units += bodega;
          entry.products += 1;
        }
      }
    }

    return {
      totalProducts: inventories.length,
      totalUnits,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts,
      outOfStockProducts,
      recentMovements: movements,
      recentTransfers: transfers,
      locations: ALL_LOCATIONS.map((loc) => locationMap.get(loc)!),
    };
  }

  async getProductInventory(productId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: {
          include: { category: true, images: true, qrCode: true },
        },
        locations: true,
        movements: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Inventario para el producto no encontrado');
    }

    return inventory;
  }

  /**
   * Productos agrupados por ubicación (Bodega derivada + canales explícitos),
   * con marca de stock bajo. Alimenta el modal al hacer click en una ubicación.
   */
  async getProductsByLocation() {
    const inventories = await this.prisma.inventory.findMany({
      include: {
        locations: true,
        product: { include: { images: true } },
      },
      orderBy: { stock: 'desc' },
    });

    const lowThreshold = (stockMin: number) => (stockMin > 0 ? stockMin : 5);
    const buckets = new Map<
      StockLocation,
      Array<{
        inventoryId: string;
        productId: string;
        name: string;
        sku: string;
        image?: string;
        status: string;
        quantity: number;
        stockTotal: number;
        stockMin: number;
        lowStock: boolean;
      }>
    >();
    for (const loc of ALL_LOCATIONS) buckets.set(loc, []);

    for (const inv of inventories) {
      const product = inv.product;
      if (!product) continue;

      const byLoc = await getStockByLocation(this.prisma, inv);
      const lowStock =
        product.status === 'ACTIVE' &&
        inv.stock > 0 &&
        inv.stock <= lowThreshold(product.stockMin ?? 0);

      const entry = {
        inventoryId: inv.id,
        productId: product.id,
        name: product.name,
        sku: product.sku,
        image: product.images?.[0]?.url,
        status: product.status,
        stockTotal: inv.stock,
        stockMin: product.stockMin ?? 0,
        lowStock,
      };

      for (const loc of ALL_LOCATIONS) {
        const qty = byLoc[loc] ?? 0;
        if (qty <= 0) continue;
        buckets.get(loc)!.push({ ...entry, quantity: qty });
      }
    }

    return ALL_LOCATIONS.map((loc) => {
      const items = buckets.get(loc)!;
      return {
        location: loc,
        label: STOCK_LOCATION_LABELS[loc],
        units: items.reduce((sum, i) => sum + i.quantity, 0),
        products: items.length,
        lowStockCount: items.filter((i) => i.lowStock).length,
        items,
      };
    });
  }

  /** N° de ticket de traspaso: TRASP-YYYYMMDD-XXXX (aleatorio por día). */
  private buildTicketReference(): string {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TRASP-${ymd}-${rand}`;
  }

  /**
   * Ticket de traspaso: mueve varios productos entre ubicaciones en una sola
   * operación atómica, todos con el mismo N° de ticket en el historial.
   */
  async transferTicket(transferTicketDto: TransferTicketDto, userId?: string) {
    const { fromLocation, toLocation, items, reference, notes } = transferTicketDto;

    if (fromLocation === toLocation) {
      throw new BadRequestException('La ubicación de origen y destino no pueden ser la misma');
    }

    const ticket = reference && reference.trim() !== '' ? reference.trim() : this.buildTicketReference();

    return this.prisma.$transaction(async (tx) => {
      const movements = [];
      let totalUnits = 0;

      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
          include: { product: { select: { name: true, sku: true } } },
        });

        if (!inventory) {
          throw new NotFoundException(
            `El producto ${item.productId} no tiene inventario registrado`,
          );
        }

        await transferStockLocation(tx, inventory, fromLocation, toLocation, item.quantity);

        const movement = await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: MovementType.TRANSFER,
            quantity: item.quantity,
            fromLocation,
            location: toLocation,
            reference: ticket,
            notes: notes && notes.trim() !== '' ? notes.trim() : 'Ticket de traspaso',
            createdBy: userId,
          },
        });

        movements.push({
          ...movement,
          product: inventory.product,
        });
        totalUnits += item.quantity;
      }

      return {
        ticket,
        fromLocation,
        toLocation,
        fromLabel: STOCK_LOCATION_LABELS[fromLocation],
        toLabel: STOCK_LOCATION_LABELS[toLocation],
        totalUnits,
        movements,
      };
    });
  }

  async registerMovement(createMovementDto: CreateMovementDto, userId?: string) {
    const { productId, type, quantity, reference, notes, fromLocation, location } =
      createMovementDto;

    return this.prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId,
            stock: 0,
          },
        });
      }

      // ── Traspaso entre ubicaciones (bodega → tienda / online / live, etc.) ──
      if (type === MovementType.TRANSFER) {
        const destination = location;
        if (!destination) {
          throw new BadRequestException('Debe indicar la ubicación de destino del traspaso');
        }
        const origin = fromLocation ?? StockLocation.BODEGA;
        if (origin === destination) {
          throw new BadRequestException('La ubicación de origen y destino no pueden ser la misma');
        }

        await transferStockLocation(tx, inventory, origin, destination, quantity);

        const movement = await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type,
            quantity,
            fromLocation: origin,
            location: destination,
            reference,
            notes,
            createdBy: userId,
          },
        });

        return { inventory, movement };
      }

      const additionTypes: MovementType[] = [MovementType.PURCHASE, MovementType.RETURN];
      const subtractionTypes: MovementType[] = [
        MovementType.SALE,
        MovementType.LOSS,
        MovementType.DAMAGE,
      ];
      const isAddition = additionTypes.includes(type);
      const isSubtraction = subtractionTypes.includes(type);

      // ── Entradas: el stock ingresa a la ubicación indicada (bodega por defecto) ──
      if (isAddition) {
        const destination = location ?? StockLocation.BODEGA;
        const result = await applyStockDelta(tx, inventory, quantity, {
          addDestination: destination,
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type,
            quantity,
            location: result.destination ?? destination,
            reference,
            notes,
            createdBy: userId,
          },
        });

        return {
          inventory: { ...inventory, stock: result.newStock },
          movement,
        };
      }

      // ── Salidas: drenan canales (venta) o bodega (pérdida/daño) ──
      if (isSubtraction) {
        const priority = fromLocation
          ? [fromLocation, ...CHANNEL_LOCATIONS.filter((l) => l !== fromLocation)]
          : CHANNEL_LOCATIONS;
        const result = await applyStockDelta(tx, inventory, -quantity, {
          drainMode: type === MovementType.SALE ? 'channels-first' : 'bodega-first',
          channelPriority: priority,
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type,
            quantity,
            fromLocation: result.origin ?? undefined,
            reference,
            notes,
            createdBy: userId,
          },
        });

        return {
          inventory: { ...inventory, stock: result.newStock },
          movement,
        };
      }

      // ── Ajuste registrado sin cambio de total (comportamiento histórico) ──
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type,
          quantity,
          reference,
          notes,
          createdBy: userId,
        },
      });

      return {
        inventory,
        movement,
      };
    });
  }

  async adjustStock(productId: string, adjustStockDto: AdjustStockDto, userId?: string) {
    const { newStock, reason } = adjustStockDto;

    return this.prisma.$transaction(async (tx) => {
      let inventory = await tx.inventory.findUnique({
        where: { productId },
      });

      if (!inventory) {
        inventory = await tx.inventory.create({
          data: {
            productId,
            stock: 0,
          },
        });
      }

      const diff = newStock - inventory.stock;
      const result = await applyStockDelta(tx, inventory, diff, {
        drainMode: 'bodega-first',
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: MovementType.ADJUSTMENT,
          quantity: Math.abs(diff),
          fromLocation: result.origin ?? undefined,
          location: result.destination ?? undefined,
          reference: 'Ajuste manual',
          notes: `${reason} (Ajuste de ${inventory.stock} a ${newStock})`,
          createdBy: userId,
        },
      });

      const updated = await tx.inventory.findUnique({
        where: { id: inventory.id },
      });

      return {
        inventory: updated,
        movement,
      };
    });
  }

  async getMovements(query: QueryMovementsDto) {
    const { productId, type, page = 1, limit = 20 } = query;

    const where: Prisma.InventoryMovementWhereInput = {};

    if (productId) {
      where.inventory = { productId };
    }

    if (type) {
      where.type = type;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          inventory: {
            include: {
              product: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
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

  async getLowStockAlerts() {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        product: { status: 'ACTIVE' },
      },
      include: {
        product: {
          include: { category: true, images: true },
        },
      },
      orderBy: { stock: 'asc' },
    });

    // Bajo stock = por debajo del mínimo del producto (5 si no tiene mínimo).
    return inventories.filter(
      (inv) => inv.stock <= (inv.product.stockMin > 0 ? inv.product.stockMin : 5),
    );
  }

  // ── Conteos cíclicos de inventario (checklist físico) ───────────────────────

  /** Agrega totales y métricas de cuadre a un conteo. */
  private mapCount(count: any) {
    const items: any[] = count.items ?? [];
    const totalItems = items.length;
    const countedItems = items.filter((i) => i.counted !== null && i.counted !== undefined).length;
    const matched = items.filter((i) => i.diff === 0).length;
    const mismatched = items.filter(
      (i) => i.diff !== null && i.diff !== undefined && i.diff !== 0,
    ).length;
    const netDiff = items.reduce((sum, i) => sum + (i.diff ?? 0), 0);
    const { items: _items, ...rest } = count;
    return {
      ...rest,
      items,
      totalItems,
      countedItems,
      matched,
      mismatched,
      netDiff,
      matchRate: countedItems > 0 ? Math.round((matched * 100) / countedItems) : null,
    };
  }

  /**
   * Crea un conteo (en curso) para una ubicación: congela el stock esperado
   * de cada producto activo al momento de iniciar el checklist.
   */
  async createCount(createInventoryCountDto: CreateInventoryCountDto, userId?: string) {
    const { location, frequency, notes } = createInventoryCountDto;

    return this.prisma.$transaction(async (tx) => {
      const inventories = await tx.inventory.findMany({
        include: {
          locations: true,
          product: { select: { id: true, status: true } },
        },
      });

      const items: Array<{ productId: string; expected: number }> = [];
      for (const inv of inventories) {
        if (!inv.product || inv.product.status !== 'ACTIVE') continue;
        const byLoc = await getStockByLocation(tx, inv);
        items.push({ productId: inv.product.id, expected: byLoc[location] ?? 0 });
      }

      if (items.length === 0) {
        throw new BadRequestException('No hay productos activos para contar en esta ubicación');
      }

      const count = await tx.inventoryCount.create({
        data: {
          location,
          frequency: frequency ?? InventoryCountFrequency.ONCE,
          status: InventoryCountStatus.IN_PROGRESS,
          notes,
          countedBy: userId,
          startedAt: new Date(),
          items: { create: items },
        },
        include: { items: true },
      });

      return this.mapCount(count);
    });
  }

  async listCounts(query: { page?: number; limit?: number; status?: InventoryCountStatus }) {
    const { page = 1, limit = 20, status } = query;
    const where: Prisma.InventoryCountWhereInput = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.inventoryCount.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.inventoryCount.count({ where }),
    ]);

    return {
      items: rows.map((r) => this.mapCount(r)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCount(id: string) {
    const count = await this.prisma.inventoryCount.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { include: { images: true } } },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!count) {
      throw new NotFoundException(`Conteo con ID ${id} no encontrado`);
    }

    return this.mapCount(count);
  }

  /** Registra lo contado físicamente de un producto (marca su check). */
  async setCountItem(countId: string, itemId: string, setCountItemDto: SetCountItemDto) {
    const count = await this.prisma.inventoryCount.findUnique({
      where: { id: countId },
      include: { items: true },
    });

    if (!count) {
      throw new NotFoundException(`Conteo con ID ${countId} no encontrado`);
    }

    if (count.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Solo los conteos en curso admiten cambios');
    }

    const item = count.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('El producto no pertenece a este conteo');
    }

    await this.prisma.inventoryCountItem.update({
      where: { id: item.id },
      data: {
        counted: setCountItemDto.counted,
        diff: setCountItemDto.counted - item.expected,
        checkedAt: new Date(),
      },
    });

    return this.getCount(countId);
  }

  /** Finaliza el conteo (exige todos los productos contados). */
  async completeCount(id: string) {
    const count = await this.prisma.inventoryCount.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!count) {
      throw new NotFoundException(`Conteo con ID ${id} no encontrado`);
    }

    if (count.status !== InventoryCountStatus.IN_PROGRESS) {
      throw new BadRequestException('Solo los conteos en curso pueden finalizarse');
    }

    const missing = count.items.filter((i) => i.counted === null || i.counted === undefined).length;
    if (missing > 0) {
      throw new BadRequestException(
        `Falta contar ${missing} producto(s) antes de finalizar el conteo`,
      );
    }

    await this.prisma.inventoryCount.update({
      where: { id },
      data: { status: InventoryCountStatus.COMPLETED, completedAt: new Date() },
    });

    return this.getCount(id);
  }

  async cancelCount(id: string) {
    const count = await this.prisma.inventoryCount.findUnique({ where: { id } });

    if (!count) {
      throw new NotFoundException(`Conteo con ID ${id} no encontrado`);
    }

    if (
      count.status !== InventoryCountStatus.SCHEDULED &&
      count.status !== InventoryCountStatus.IN_PROGRESS
    ) {
      throw new BadRequestException('Solo los conteos programados o en curso pueden cancelarse');
    }

    await this.prisma.inventoryCount.update({
      where: { id },
      data: { status: InventoryCountStatus.CANCELLED },
    });

    return this.getCount(id);
  }

  /** KPIs de cuadre: cuánto existe vs. cuánto se contó, por ubicación. */
  async getCountsStats() {
    const counts = await this.prisma.inventoryCount.findMany({ include: { items: true } });

    const completed = counts.filter((c) => c.status === InventoryCountStatus.COMPLETED);
    const allItems = completed.flatMap((c) => c.items ?? []);
    const itemsCounted = allItems.length;
    const itemsMatched = allItems.filter((i) => i.diff === 0).length;
    const netDiff = allItems.reduce((sum, i) => sum + (i.diff ?? 0), 0);

    const lastCompleted =
      completed
        .filter((c) => c.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt as Date).getTime() - new Date(a.completedAt as Date).getTime(),
        )[0] ?? null;

    const byLocation = ALL_LOCATIONS.map((loc) => {
      const locCounts = completed.filter((c) => c.location === loc);
      const locItems = locCounts.flatMap((c) => c.items ?? []);
      const matched = locItems.filter((i) => i.diff === 0).length;
      return {
        location: loc,
        label: STOCK_LOCATION_LABELS[loc],
        counts: locCounts.length,
        itemsCounted: locItems.length,
        matchRate: locItems.length > 0 ? Math.round((matched * 100) / locItems.length) : null,
        netDiff: locItems.reduce((sum, i) => sum + (i.diff ?? 0), 0),
      };
    });

    return {
      total: counts.length,
      completed: completed.length,
      inProgress: counts.filter((c) => c.status === InventoryCountStatus.IN_PROGRESS).length,
      scheduled: counts.filter((c) => c.status === InventoryCountStatus.SCHEDULED).length,
      cancelled: counts.filter((c) => c.status === InventoryCountStatus.CANCELLED).length,
      itemsCounted,
      itemsMatched,
      mismatched: itemsCounted - itemsMatched,
      matchRate: itemsCounted > 0 ? Math.round((itemsMatched * 100) / itemsCounted) : null,
      netDiff,
      countsWithDiff: completed.filter((c) => (c.items ?? []).some((i) => i.diff !== 0)).length,
      lastCompletedAt: lastCompleted?.completedAt ?? null,
      lastFrequency: lastCompleted?.frequency ?? null,
      byLocation,
    };
  }
}
