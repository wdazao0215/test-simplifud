import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PaginationDto,
  PaginatedResult,
} from '../../common/dto/pagination.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderRepository {
  constructor(private prisma: PrismaService) { }

  async create(data: {
    userId: string;
    status: OrderStatus;
    total: number;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[];
  }) {
    return this.prisma.order.create({
      data: {
        userId: data.userId,
        status: data.status,
        total: data.total,
        items: {
          create: data.items,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByUserIdPaginated(
    userId: string,
    params: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((order) => ({
        id: order.id,
        status: order.status,
        total: order.total.toString(),
        createdAt: order.createdAt.toISOString(),
        items: order.items.map((item) => ({
          productId: item.productId,
          name: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          subtotal: (item.quantity * Number(item.unitPrice)).toString(),
        })),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
