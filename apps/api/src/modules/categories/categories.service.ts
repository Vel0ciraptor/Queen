import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { collectBranchIds } from '../../common/utils/category-tree.util';
import { CategoryDimension } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertParentMatchesDimension(
    parentId: string | null | undefined,
    dimension?: string,
  ) {
    if (!parentId) return;
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new BadRequestException('La categoría padre no existe');
    }
    if (dimension && parent.dimension !== dimension) {
      throw new BadRequestException(
        'La categoría padre pertenece a otra dimensión',
      );
    }
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { dimension, parentId, name } = createCategoryDto;

    await this.assertParentMatchesDimension(parentId, dimension);

    const existing = await this.prisma.category.findFirst({
      where: {
        name,
        dimension,
        parentId: parentId ?? null,
        isActive: true,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe una categoría con este nombre en esta dimensión y nivel',
      );
    }

    return this.prisma.category.create({
      data: {
        name,
        dimension,
        description: createCategoryDto.description,
        parentId: parentId ?? null,
      },
    });
  }

  async findAll(includeInactive = false, dimension?: CategoryDimension) {
    return this.prisma.category.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(dimension ? { dimension } : {}),
      },
      include: {
        _count: {
          select: {
            products: true,
            materialProducts: true,
            colorProducts: true,
            shapeProducts: true,
          },
        },
      },
      orderBy: [{ dimension: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            images: true,
            inventory: true,
          },
        },
        children: true,
        _count: {
          select: {
            products: true,
            materialProducts: true,
            colorProducts: true,
            shapeProducts: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Categoría con ID ${id} no encontrada`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const current = await this.findOne(id);

    // Validar padre (misma dimensión y que no sea a sí mismo ni un descendiente)
    if (updateCategoryDto.parentId !== undefined) {
      const newParentId = updateCategoryDto.parentId;
      if (newParentId) {
        if (newParentId === id) {
          throw new BadRequestException('Una categoría no puede ser su propio padre');
        }
        await this.assertParentMatchesDimension(
          newParentId,
          updateCategoryDto.dimension ?? current.dimension,
        );
        // Evitar ciclos: el nuevo padre no puede estar dentro de la rama de `id`
        const all = await this.prisma.category.findMany({
          select: { id: true, parentId: true },
        });
        const branch = new Set(collectBranchIds(all, id));
        if (branch.has(newParentId)) {
          throw new BadRequestException(
            'No se puede mover una categoría bajo una de sus subcategorías',
          );
        }
      }
    }

    if (updateCategoryDto.name) {
      const dimension = updateCategoryDto.dimension ?? current.dimension;
      const parentId =
        updateCategoryDto.parentId !== undefined
          ? updateCategoryDto.parentId
          : current.parentId;
      const existing = await this.prisma.category.findFirst({
        where: {
          name: updateCategoryDto.name,
          dimension,
          parentId: parentId ?? null,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          'Ya existe una categoría con este nombre en esta dimensión y nivel',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(updateCategoryDto.name !== undefined ? { name: updateCategoryDto.name } : {}),
        ...(updateCategoryDto.dimension !== undefined
          ? { dimension: updateCategoryDto.dimension }
          : {}),
        ...(updateCategoryDto.description !== undefined
          ? { description: updateCategoryDto.description }
          : {}),
        ...(updateCategoryDto.isActive !== undefined
          ? { isActive: updateCategoryDto.isActive }
          : {}),
        ...(updateCategoryDto.parentId !== undefined
          ? { parentId: updateCategoryDto.parentId }
          : {}),
      },
    });
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    // No permitir desactivar si tiene subcategorías activas
    if (category.children.some((c) => c.isActive)) {
      throw new BadRequestException(
        'Esta categoría tiene subcategorías. Desactívalas primero.',
      );
    }

    const inUse =
      category._count &&
      ((category._count.products ?? 0) > 0 ||
        (category._count as any).materialProducts > 0 ||
        (category._count as any).colorProducts > 0 ||
        (category._count as any).shapeProducts > 0);

    if (inUse) {
      throw new BadRequestException(
        'Esta categoría está en uso por productos y no puede desactivarse',
      );
    }

    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
