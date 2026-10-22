import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { MovementType, Prisma } from '@prisma/client';
import { branchFilter } from '../../common/utils/category-tree.util';
import {
  SkuDimensions,
  buildSkuPrefix,
  nextSkuFor,
} from '../../common/utils/sku.util';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';
import sharp = require('sharp');

const MAX_IMAGES_PER_PRODUCT = 5;
const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const PRODUCTS_UPLOAD_DIR = join(UPLOADS_DIR, 'products');

const DIMENSION_INCLUDE = {
  category: true,
  material: true,
  color: true,
  shape: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Valida que cada FK apunte a una categoría de la dimensión esperada.
  private async assertDimensions(
    data: { categoryId?: string; materialId?: string; colorId?: string; shapeId?: string },
    requireAll = true,
  ) {
    const checks: Array<[string | undefined, string, string]> = [
      [data.categoryId, 'TYPE', 'el tipo de joya'],
      [data.materialId, 'MATERIAL', 'el material'],
      [data.colorId, 'COLOR', 'el color'],
      [data.shapeId, 'SHAPE', 'la forma'],
    ];

    for (const [id, dimension, label] of checks) {
      if (!id) {
        if (requireAll && dimension !== 'SHAPE') {
          throw new BadRequestException(`Falta ${label} del producto`);
        }
        continue;
      }
      const cat = await this.prisma.category.findUnique({ where: { id } });
      if (!cat) {
        throw new BadRequestException(`La categoría ${label} no existe`);
      }
      if (cat.dimension !== dimension) {
        throw new BadRequestException(
          `El campo ${label} debe ser una categoría de dimensión ${dimension}`,
        );
      }
    }
  }

  // Carga los nombres de las dimensiones para construir el SKU.
  private async dimensionNames(
    client: Pick<Prisma.TransactionClient, 'category'>,
    data: { categoryId?: string; materialId?: string; colorId?: string; shapeId?: string },
  ): Promise<SkuDimensions> {
    const ids = [data.categoryId, data.materialId, data.colorId, data.shapeId].filter(
      Boolean,
    ) as string[];
    const categories = await client.category.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const byId = new Map(categories.map((c) => [c.id, c.name]));
    return {
      tipo: byId.get(data.categoryId ?? '') ?? '',
      material: byId.get(data.materialId ?? '') ?? '',
      color: byId.get(data.colorId ?? '') ?? '',
      shape: data.shapeId ? byId.get(data.shapeId) : undefined,
    };
  }

  // Genera el SKU auto: TIPO-MATERIAL-COLOR[-FORMA]-00001 (crece solo a 6 dígitos).
  private async generateSku(
    client: Pick<Prisma.TransactionClient, 'category' | 'product'>,
    data: { categoryId?: string; materialId?: string; colorId?: string; shapeId?: string },
  ): Promise<string> {
    const dims = await this.dimensionNames(client, data);
    if (!dims.tipo || !dims.material || !dims.color) {
      throw new BadRequestException('Faltan dimensiones (tipo, material o color) para generar el SKU');
    }
    return nextSkuFor(client, dims);
  }

  // Vista previa del próximo SKU para un conjunto de dimensiones (formularios).
  async previewNextSku(data: {
    categoryId: string;
    materialId: string;
    colorId: string;
    shapeId?: string;
  }) {
    await this.assertDimensions(data);
    const dims = await this.dimensionNames(this.prisma, data);
    const prefix = buildSkuPrefix(dims);
    const sku = await this.generateSku(this.prisma, data);
    return { prefix, sku };
  }

  async create(createProductDto: CreateProductDto) {
    await this.assertDimensions(createProductDto);

    const { initialStock, ...productData } = createProductDto;

    return this.prisma.$transaction(async (tx) => {
      // SKU: usa el enviado o lo genera a partir de las dimensiones.
      let sku = productData.sku?.trim() ?? '';
      if (!sku) {
        sku = await this.generateSku(tx, createProductDto);
      } else {
        const existing = await tx.product.findUnique({ where: { sku } });
        if (existing) {
          throw new ConflictException(`Ya existe un producto con el SKU ${sku}`);
        }
      }

      const product = await tx.product.create({
        data: {
          ...productData,
          sku,
        },
        include: {
          ...DIMENSION_INCLUDE,
        },
      });

      // Create initial inventory record
      const inventory = await tx.inventory.create({
        data: {
          productId: product.id,
          stock: initialStock || 0,
        },
      });

      // If initial stock > 0, record movement
      if (initialStock && initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            inventoryId: inventory.id,
            type: MovementType.PURCHASE,
            quantity: initialStock,
            reference: 'Inventario Inicial',
            notes: 'Carga inicial al crear producto',
          },
        });
      }

      // Create QR Code entry
      await tx.qRCode.create({
        data: {
          productId: product.id,
          code: `QS-${product.sku}`,
        },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          ...DIMENSION_INCLUDE,
          inventory: true,
          qrCode: true,
          images: true,
        },
      });
    });
  }

  async findAll(query: QueryProductDto) {
    const {
      search,
      categoryId,
      materialId,
      colorId,
      shapeId,
      status,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtros por dimensión, incluyendo subcategorías de la rama seleccionada.
    const typeIds = await branchFilter(this.prisma, categoryId ? [categoryId] : undefined);
    const materialIds = await branchFilter(this.prisma, materialId ? [materialId] : undefined);
    const colorIds = await branchFilter(this.prisma, colorId ? [colorId] : undefined);
    const shapeIds = await branchFilter(this.prisma, shapeId ? [shapeId] : undefined);

    if (typeIds) where.categoryId = { in: typeIds };
    if (materialIds) where.materialId = { in: materialIds };
    if (colorIds) where.colorId = { in: colorIds };
    if (shapeIds) where.shapeId = { in: shapeIds };

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          ...DIMENSION_INCLUDE,
          inventory: true,
          images: {
            orderBy: { order: 'asc' },
          },
          qrCode: true,
        },
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        ...DIMENSION_INCLUDE,
        inventory: {
          include: {
            movements: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        qrCode: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    }

    return product;
  }

  async findBySku(sku: string) {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        ...DIMENSION_INCLUDE,
        inventory: true,
        images: true,
        qrCode: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Producto con SKU ${sku} no encontrado`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);

    if (updateProductDto.sku) {
      const existing = await this.prisma.product.findFirst({
        where: {
          sku: updateProductDto.sku,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(`Ya existe un producto con el SKU ${updateProductDto.sku}`);
      }
    }

    // Solo validar las dimensiones que se están enviando en esta actualización.
    await this.assertDimensions(updateProductDto, false);

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: {
        ...DIMENSION_INCLUDE,
        inventory: true,
        images: true,
        qrCode: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async addImage(productId: string, imageUrl: string, isPrimary = false, altText?: string) {
    await this.findOne(productId);

    if (isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        url: imageUrl,
        altText,
        isPrimary,
      },
    });
  }

  async uploadImage(productId: string, file: Express.Multer.File) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Debes adjuntar un archivo de imagen válido');
    }

    await this.findOne(productId);

    const count = await this.prisma.productImage.count({ where: { productId } });
    if (count >= MAX_IMAGES_PER_PRODUCT) {
      throw new BadRequestException(
        `Un producto puede tener como máximo ${MAX_IMAGES_PER_PRODUCT} imágenes`,
      );
    }

    if (!existsSync(PRODUCTS_UPLOAD_DIR)) {
      mkdirSync(PRODUCTS_UPLOAD_DIR, { recursive: true });
    }

    const filename = `${randomUUID()}.webp`;
    await sharp(file.buffer)
      .rotate()
      .resize({ width: 1400, height: 1800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join(PRODUCTS_UPLOAD_DIR, filename));

    const url = `/api/v1/uploads/products/${filename}`;
    return this.addImage(productId, url, count === 0, file.originalname);
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException(`Imagen ${imageId} no encontrada en este producto`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
      await tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });
    });

    return this.prisma.productImage.findUnique({ where: { id: imageId } });
  }

  async removeImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });

    if (!image) {
      throw new NotFoundException(`Imagen con ID ${imageId} no encontrada`);
    }

    const deleted = await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    const marker = '/api/v1/uploads/';
    if (image.url?.startsWith(marker)) {
      const relative = image.url.slice(marker.length);
      const folder = relative.split('/')[0];
      const file = basename(relative);
      const filePath = join(UPLOADS_DIR, basename(folder), file);
      if (filePath.startsWith(UPLOADS_DIR) && existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          /* archivo ya eliminado o en uso */
        }
      }
    }

    // Reassign primary flag to a remaining image if needed
    if (image.isPrimary) {
      const remaining = await this.prisma.productImage.findFirst({
        where: { productId: image.productId },
        orderBy: { order: 'asc' },
      });
      if (remaining) {
        await this.prisma.productImage.update({
          where: { id: remaining.id },
          data: { isPrimary: true },
        });
      }
    }

    return deleted;
  }
}
