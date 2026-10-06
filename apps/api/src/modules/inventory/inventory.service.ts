import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getInventoryOverview() {
    const [totalProducts, lowStockProducts, outOfStockProducts, movements] = await Promise.all([
      this.prisma.inventory.count(),
      this.prisma.inventory.findMany({
        where: {
          product: { status: 'ACTIVE' },
          stock: { gt: 0 },
          AND: [
            {
              stock: {
                lte: 5, // default or relative to stockMin
              },
            },
          ],
        },
        include: {
          product: {
            include: { images: true, category: true },
          },
        },
      }),
      this.prisma.inventory.findMany({
        where: {
          product: { status: 'ACTIVE' },
          stock: { lte: 0 },
        },
        include: {
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
    ]);

    return {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts,
      outOfStockProducts,
      recentMovements: movements,
    };
  }

  async getProductInventory(productId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
      include: {
        product: {
          include: { category: true, images: true, qrCode: true },
        },
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

  async registerMovement(createMovementDto: CreateMovementDto, userId?: string) {
    const { productId, type, quantity, reference, notes } = createMovementDto;

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

      const additionTypes: MovementType[] = [MovementType.PURCHASE, MovementType.RETURN];
      const subtractionTypes: MovementType[] = [MovementType.SALE, MovementType.LOSS, MovementType.DAMAGE];
      const isAddition = additionTypes.includes(type);
      const isSubtraction = subtractionTypes.includes(type);

      if (isSubtraction && inventory.stock < quantity) {
        throw new BadRequestException(
          `Stock insuficiente. Stock actual: ${inventory.stock}, Solicitado: ${quantity}`,
        );
      }

      const newStock = isAddition
        ? inventory.stock + quantity
        : isSubtraction
        ? inventory.stock - quantity
        : inventory.stock;

      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: { stock: newStock },
      });

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
        inventory: updatedInventory,
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

      const updatedInventory = await tx.inventory.update({
        where: { id: inventory.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          type: MovementType.ADJUSTMENT,
          quantity: Math.abs(diff),
          reference: 'Ajuste manual',
          notes: `${reason} (Ajuste de ${inventory.stock} a ${newStock})`,
          createdBy: userId,
        },
      });

      return {
        inventory: updatedInventory,
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
    return this.prisma.inventory.findMany({
      where: {
        product: { status: 'ACTIVE' },
        stock: { lte: 5 },
      },
      include: {
        product: {
          include: { category: true, images: true },
        },
      },
      orderBy: { stock: 'asc' },
    });
  }
}
