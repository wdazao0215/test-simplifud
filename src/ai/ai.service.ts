import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { puter } from '@heyputer/puter.js';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';

interface CreateProductParams {
  name: string;
  description?: string;
  price: number;
  stock: number;
}

interface CreateOrderParams {
  items: { productName: string; quantity: number }[];
}

@Injectable()
export class AiService {
  constructor(
    private configService: ConfigService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  async processCommand(userId: string, command: string) {
    const systemPrompt = `Eres un asistente que extrae información de comandos en lenguaje natural para un sistema de pedidos de café/restaurante.
Debes analizar el comando del usuario y determinar la intención (CREATE_PRODUCT o CREATE_ORDER).
Para CREATE_PRODUCT, extrae: name, description (opcional), price, stock.
Para CREATE_ORDER, extrae: items (array con productName y quantity).

Responde SOLO con JSON válido, sin texto adicional.`;

    try {
      const response: any = await puter.ai.chat(
        `System: ${systemPrompt}\n\nUser: ${command}`,
        { model: 'gpt-4o' },
      );

      const content = response?.text || response || '';
      if (!content) {
        throw new BadRequestException('No se pudo procesar el comando');
      }

      const parsed = JSON.parse(content);
      const intent = parsed.intent?.toUpperCase();

      if (intent === 'CREATE_PRODUCT') {
        return this.handleCreateProduct(parsed.parameters);
      } else if (intent === 'CREATE_ORDER') {
        return this.handleCreateOrder(userId, parsed.parameters);
      }

      throw new BadRequestException(
        'No se pudo determinar la intención del comando. Intenta ser más específico.',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error al procesar el comando: ${error.message}`,
      );
    }
  }

  private async handleCreateProduct(params: CreateProductParams) {
    const product = await this.prisma.product.create({
      data: {
        name: params.name,
        description: params.description || '',
        price: params.price,
        stock: params.stock,
        isActive: true,
      },
    });

    return {
      intent: 'CREATE_PRODUCT',
      result: {
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        stock: product.stock,
      },
      message: `Producto "${product.name}" creado exitosamente`,
    };
  }

  private async handleCreateOrder(userId: string, params: CreateOrderParams) {
    const productNames = params.items.map((item) =>
      item.productName.toLowerCase(),
    );

    const products = await this.prisma.product.findMany({
      where: {
        name: { in: productNames },
        isActive: true,
      },
    });

    if (products.length === 0) {
      throw new BadRequestException('No se encontraron productos disponibles');
    }

    const orderItems = params.items
      .map((item) => {
        const product = products.find(
          (p) => p.name.toLowerCase() === item.productName.toLowerCase(),
        );
        if (!product) return null;
        return {
          productId: product.id,
          quantity: item.quantity,
        };
      })
      .filter(
        (item): item is { productId: string; quantity: number } =>
          item !== null,
      );

    if (orderItems.length === 0) {
      throw new BadRequestException(
        'No se pudieron crear los items de la orden',
      );
    }

    const order = await this.ordersService.create(userId, {
      items: orderItems,
    });

    return {
      intent: 'CREATE_ORDER',
      result: order,
      message: `Orden creada exitosamente con ${orderItems.reduce((sum, item) => sum + item.quantity, 0)} productos`,
    };
  }
}
