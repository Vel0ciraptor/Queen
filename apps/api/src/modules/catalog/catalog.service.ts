import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { branchFilter } from '../../common/utils/category-tree.util';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // Devuelve las categorías usadas por productos activos, con su dimensión.
  // El filtro público se agrupa por dimensión (Tipo, Material, Color, Forma).
  // Un padre aparece con el conteo acumulado de sus descendientes, para que
  // sirva como filtro amplio (p. ej. "Oro" incluye "Oro 18k" y "Oro 14k").
  async getCatalogCategories() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: { where: { status: 'ACTIVE' } },
            materialProducts: { where: { status: 'ACTIVE' } },
            colorProducts: { where: { status: 'ACTIVE' } },
            shapeProducts: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: [{ dimension: 'asc' }, { name: 'asc' }],
    });

    // Uso directo por categoría (productos que la referencian en cualquier dimensión).
    const direct = new Map<string, number>();
    for (const c of categories) {
      direct.set(
        c.id,
        (c._count.products ?? 0) +
          (c._count.materialProducts ?? 0) +
          (c._count.colorProducts ?? 0) +
          (c._count.shapeProducts ?? 0),
      );
    }

    // Acumular hacia arriba: cada padre suma el uso de sus descendientes.
    const childrenByParent = new Map<string, string[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const arr = childrenByParent.get(c.parentId) ?? [];
      arr.push(c.id);
      childrenByParent.set(c.parentId, arr);
    }
    const total = new Map<string, number>();
    const compute = (id: string): number => {
      if (total.has(id)) return total.get(id)!;
      let sum = direct.get(id) ?? 0;
      for (const childId of childrenByParent.get(id) ?? []) sum += compute(childId);
      total.set(id, sum);
      return sum;
    };
    for (const c of categories) compute(c.id);

    return categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        dimension: c.dimension,
        parentId: c.parentId,
        productCount: total.get(c.id) ?? 0,
      }))
      .filter((c) => c.productCount > 0);
  }

  async getCatalogProducts(
    categoryId?: string,
    search?: string,
    materialId?: string,
    colorId?: string,
    shapeId?: string,
  ) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
    };

    // Filtros por dimensión (incluyen subcategorías de la rama).
    const typeIds = await branchFilter(this.prisma, categoryId ? [categoryId] : undefined);
    const materialIds = await branchFilter(this.prisma, materialId ? [materialId] : undefined);
    const colorIds = await branchFilter(this.prisma, colorId ? [colorId] : undefined);
    const shapeIds = await branchFilter(this.prisma, shapeId ? [shapeId] : undefined);

    if (typeIds) where.categoryId = { in: typeIds };
    if (materialIds) where.materialId = { in: materialIds };
    if (colorIds) where.colorId = { in: colorIds };
    if (shapeIds) where.shapeId = { in: shapeIds };

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
        material: true,
        color: true,
        shape: true,
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
      category: p.category?.name ?? null,
      categoryId: p.categoryId,
      material: p.material?.name ?? null,
      color: p.color?.name ?? null,
      shape: p.shape?.name ?? null,
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
        material: true,
        color: true,
        shape: true,
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
      material: product.material,
      color: product.color,
      shape: product.shape,
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
        material: true,
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
      category: p.category?.name ?? null,
      material: p.material?.name ?? null,
      images: p.images,
      inStock: true,
    }));
  }
}
