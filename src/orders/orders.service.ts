import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { OrderRepository } from './repositories/order.repository';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private orderRepository: OrderRepository,
    private productsService: ProductsService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    this.logger.log(`Creando orden para usuario: ${userId}`);
    this.logger.debug(`Items: ${JSON.stringify(createOrderDto.items)}`);

    const productIds = createOrderDto.items.map((item) => item.productId);
    const products = await this.productsService.findByIds(productIds);

    if (products.length !== productIds.length) {
      const foundIds = products.map((p) => p.id);
      const missingIds = productIds.filter((id) => !foundIds.includes(id));
      this.logger.warn(`Productos no encontrados: ${missingIds.join(', ')}`);
      throw new NotFoundException(
        `Productos no encontrados: ${missingIds.join(', ')}`,
      );
    }

    const orderItems: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[] = [];
    let total = 0;

    for (const item of createOrderDto.items) {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        continue;
      }

      if (!product.isActive) {
        this.logger.warn(`Producto inactivo: ${product.name}`);
        throw new BadRequestException(
          `El producto "${product.name}" no está disponible`,
        );
      }

      if (product.stock < item.quantity) {
        this.logger.warn(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, solicitado: ${item.quantity}`,
        );
        throw new BadRequestException(
          `Stock insuficiente para "${product.name}". Disponible: ${product.stock}, solicitado: ${item.quantity}`,
        );
      }

      const unitPrice = Number(product.price);
      const subtotal = unitPrice * item.quantity;
      total += subtotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
      });
    }

    this.logger.log(`Orden procesada. Total: ${total}`);

    const order = await this.orderRepository.create({
      userId,
      status: OrderStatus.PENDING,
      total,
      items: orderItems,
    });

    this.logger.log(`Orden creada exitosamente. ID: ${order.id}`);

    return this.formatOrderResponse(order);
  }

  private formatOrderResponse(order: any) {
    return {
      id: order.id,
      status: order.status,
      total: order.total.toString(),
      items: order.items.map((item: any) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        subtotal: (item.quantity * Number(item.unitPrice)).toString(),
      })),
      createdAt: order.createdAt.toISOString(),
    };
  }

  async findByUserId(userId: string, paginationDto?: PaginationDto) {
    this.logger.debug(`Consultando órdenes para usuario: ${userId}`);

    if (paginationDto && (paginationDto.page || paginationDto.limit)) {
      return this.orderRepository.findByUserIdPaginated(userId, paginationDto);
    }
    const orders = await this.orderRepository.findByUserId(userId);
    this.logger.debug(`Órdenes encontradas: ${orders.length}`);
    return orders.map((order: any) => ({
      id: order.id,
      status: order.status,
      total: order.total.toString(),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item: any) => ({
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        subtotal: (item.quantity * Number(item.unitPrice)).toString(),
      })),
    }));
  }

  async findById(id: string) {
    this.logger.debug(`Consultando orden: ${id}`);
    return this.orderRepository.findById(id);
  }
}
