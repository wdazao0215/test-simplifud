import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {}

  async processCommand(userId: string, command: string) {
    this.logger.log(`Procesando comando AI para usuario: ${userId}`);
    this.logger.debug(`Comando: ${command}`);

    const systemPrompt = `Eres un asistente que extrae información de comandos en lenguaje natural para un sistema de pedidos de café/restaurante.
Debes analizar el comando del usuario y determinar la intención (CREATE_PRODUCT o CREATE_ORDER).
Para CREATE_PRODUCT, extrae: name, description (opcional), price, stock.
Para CREATE_ORDER, extrae: items (array con productName y quantity).

Responde SOLO con JSON válido, sin texto adicional.`;

    try {
      this.logger.log('Enviando comando a Puter.ai...');

      const response: any = await puter.ai.chat(
        `System: ${systemPrompt}\n\nUser: ${command}`,
        { model: 'gpt-4o' },
      );

      const content = response?.text || response || '';
      if (!content) {
        this.logger.error('Puter.ai retornó respuesta vacía');
        throw new BadRequestException('No se pudo procesar el comando');
      }

      this.logger.debug(`Respuesta de Puter.ai: ${content}`);

      const parsed = JSON.parse(content);
      const intent = parsed.intent?.toUpperCase();

      this.logger.log(`Intención detectada: ${intent}`);

      if (intent === 'CREATE_PRODUCT') {
        this.logger.log(
          `Creando producto: ${JSON.stringify(parsed.parameters)}`,
        );
        return this.handleCreateProduct(parsed.parameters);
      } else if (intent === 'CREATE_ORDER') {
        this.logger.log(`Creando orden: ${JSON.stringify(parsed.parameters)}`);
        return this.handleCreateOrder(userId, parsed.parameters);
      }

      this.logger.warn(`Intención no reconocida: ${intent}`);
      throw new BadRequestException(
        'No se pudo determinar la intención del comando. Intenta ser más específico.',
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.warn(`Error de negocio: ${error.message}`);
        throw error;
      }
      this.logger.error(
        `Error al procesar comando: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Error al procesar el comando: ${error.message}`,
      );
    }
  }

  private async handleCreateProduct(params: CreateProductParams) {
    this.logger.log(`Creando producto: ${params.name}`);

    const product = await this.prisma.product.create({
      data: {
        name: params.name,
        description: params.description || '',
        price: params.price,
        stock: params.stock,
        isActive: true,
      },
    });

    this.logger.log(`Producto creado exitosamente: ${product.id}`);

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
    this.logger.log(`Creando orden para usuario: ${userId}`);

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
      this.logger.warn('No se encontraron productos disponibles');
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
      this.logger.warn('No se pudieron crear los items de la orden');
      throw new BadRequestException(
        'No se pudieron crear los items de la orden',
      );
    }

    const order = await this.ordersService.create(userId, {
      items: orderItems,
    });

    this.logger.log(`Orden creada exitosamente: ${order.id}`);

    return {
      intent: 'CREATE_ORDER',
      result: order,
      message: `Orden creada exitosamente con ${orderItems.reduce((sum, item) => sum + item.quantity, 0)} productos`,
    };
  }
}
