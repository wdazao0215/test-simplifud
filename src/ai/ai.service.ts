import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { init } from '@heyputer/puter.js/src/init.cjs';
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
  private puter: any;

  constructor(
    private configService: ConfigService,
    private productsService: ProductsService,
    private ordersService: OrdersService,
    private prisma: PrismaService,
  ) {
    const authToken = this.configService.get<string>('PUTER_AUTH_TOKEN');
    if (authToken) {
      this.puter = init(authToken);
      this.logger.log('Puter.ai inicializado correctamente');
    } else {
      this.logger.warn('PUTER_AUTH_TOKEN no configurado');
    }
  }

  async processCommand(userId: string, command: string) {
    if (!this.puter) {
      throw new BadRequestException(
        'Puter.ai no está configurado. Agrega PUTER_AUTH_TOKEN en el archivo .env',
      );
    }

    this.logger.log(`Procesando comando AI para usuario: ${userId}`);
    this.logger.debug(`Comando: ${command}`);

    const systemPrompt = `Eres un asistente que extrae información de comandos en lenguaje natural para un sistema de pedidos de café/restaurante.
Debes analizar el comando del usuario y determinar la intención (CREATE_PRODUCT o CREATE_ORDER).
Para CREATE_PRODUCT, extrae: name, description (opcional), price, stock.
Para CREATE_ORDER, extrae: items (array con productName y quantity).

Responde SOLO con JSON válido, sin texto adicional.`;

    try {
      this.logger.log('Enviando comando a Puter.ai...');

      const response: any = await this.puter.ai.chat(
        `System: ${systemPrompt}\n\nUser: ${command}`,
        { model: 'gpt-4o' },
      );

      this.logger.debug(
        `Respuesta cruda de Puter.ai: ${JSON.stringify(response)}`,
      );

      let content = '';

      if (response?.text) {
        content = response.text;
      } else if (response?.message?.content) {
        content = response.message.content;
      } else if (typeof response === 'string') {
        content = response;
      } else if (response?.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content;
      } else {
        content = JSON.stringify(response);
      }

      if (!content || content === 'undefined') {
        this.logger.error('Puter.ai retornó respuesta vacía', { response });
        throw new BadRequestException('No se pudo procesar el comando');
      }

      content = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      this.logger.debug(`Contenido extraído: ${content}`);

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        this.logger.error(`Respuesta no es JSON válido: ${content}`);
        throw new BadRequestException(
          'La respuesta del AI no es válida. Intenta ser más específico.',
        );
      }

      if (!parsed || typeof parsed !== 'object') {
        this.logger.error(`Parsed no es un objeto válido: ${content}`);
        throw new BadRequestException(
          'La respuesta del AI no es válida. Intenta ser más específico.',
        );
      }

      const intent = (parsed.intent || parsed.intention)?.toUpperCase();
      const params = parsed.parameters || parsed;

      this.logger.log(`Intención detectada: ${intent}`);
      this.logger.debug(`Parámetros: ${JSON.stringify(params)}`);

      if (intent === 'CREATE_PRODUCT') {
        this.logger.log(`Creando producto: ${JSON.stringify(params)}`);
        return this.handleCreateProduct(params);
      } else if (intent === 'CREATE_ORDER') {
        this.logger.log(`Creando orden: ${JSON.stringify(params)}`);
        return this.handleCreateOrder(userId, params);
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
