import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll() {
    // Return tree of active categories (top level with children)
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        children: {
          orderBy: { name: 'asc' },
        },
      },
    });

    return categories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);

    // Check slug uniqueness
    const existingSlug = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Category slug '${slug}' already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
      // Enforce max 2 levels of nesting
      if (parent.parentId) {
        throw new BadRequestException(
          'Category hierarchy cannot exceed 2 levels (parent -> child)',
        );
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
      if (parent.parentId) {
        throw new BadRequestException(
          'Category hierarchy cannot exceed 2 levels (parent -> child)',
        );
      }

      // Check if this category currently has children (if it does, making it a child would create 3 levels)
      const childrenCount = await this.prisma.category.count({
        where: { parentId: id },
      });
      if (childrenCount > 0) {
        throw new BadRequestException(
          'Cannot assign a parent to a category that has sub-categories (exceeds 2-level hierarchy limit)',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        services: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with active sub-categories. Delete sub-categories first.',
      );
    }

    if (category.services.length > 0) {
      throw new BadRequestException(
        'Cannot delete category linked to existing services.',
      );
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}
