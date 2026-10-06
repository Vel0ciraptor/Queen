import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCatalogCategories() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            status: 'ACTIVE',
          },
        },
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCatalogProducts(categoryId?: string, search?: string) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
        inventory: {
          select: { stock: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      salePrice: Number(p.salePrice),
      category: p.category.name,
      categoryId: p.categoryId,
      images: p.images,
      inStock: (p.inventory?.stock ?? 0) > 0,
      stock: p.inventory?.stock ?? 0,
    }));
  }

  async getProductDetails(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [{ id }, { sku: id }],
        status: 'ACTIVE',
      },
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
        inventory: {
          select: { stock: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no disponible en el catálogo');
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      salePrice: Number(product.salePrice),
      category: product.category,
      images: product.images,
      inStock: (product.inventory?.stock ?? 0) > 0,
      stock: product.inventory?.stock ?? 0,
    };
  }

  async getFeaturedProducts(limit = 8) {
    const products = await this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        inventory: {
          stock: { gt: 0 },
        },
      },
      take: limit,
      include: {
        category: true,
        images: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      salePrice: Number(p.salePrice),
      category: p.category.name,
      images: p.images,
      inStock: true,
    }));
  }
}
