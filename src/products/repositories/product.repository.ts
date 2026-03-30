import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductRepository {
  constructor(private prisma: PrismaService) {}

  async findActiveProducts(
    params: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((product) => ({
        ...product,
        price: product.price.toString(),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }

  async findByIds(ids: string[]) {
    return this.prisma.product.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });
  }
}
