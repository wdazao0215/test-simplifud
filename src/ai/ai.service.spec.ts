import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';

jest.mock('@heyputer/puter.js', () => ({
  puter: {
    ai: {
      chat: jest.fn(),
    },
  },
}));

import { puter } from '@heyputer/puter.js';

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;
  let ordersService: OrdersService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockProductsService = {
    findAll: jest.fn(),
  };

  const mockOrdersService = {
    create: jest.fn(),
  };

  const mockPrisma = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProductsService, useValue: mockProductsService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('processCommand', () => {
    const userId = 'user-uuid';

    it('should process CREATE_PRODUCT command successfully', async () => {
      const mockResponse = {
        text: JSON.stringify({
          intent: 'CREATE_PRODUCT',
          parameters: {
            name: 'Latte de Vainilla',
            description: 'Delicioso latte con vainilla',
            price: 55,
            stock: 80,
          },
        }),
      };

      (puter.ai.chat as jest.Mock).mockResolvedValue(mockResponse);

      const mockCreate = {
        id: 'product-new',
        name: 'Latte de Vainilla',
        price: 55,
        stock: 80,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.product.create.mockResolvedValue(mockCreate);

      const result = await service.processCommand(
        userId,
        'Agrega un producto llamado Latte de Vainilla precio 55 stock 80',
      );

      expect(result).toHaveProperty('intent', 'CREATE_PRODUCT');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('message');
    });

    it('should process CREATE_ORDER command successfully', async () => {
      const mockResponse = {
        text: JSON.stringify({
          intent: 'CREATE_ORDER',
          parameters: {
            items: [{ productName: 'Café Americano', quantity: 2 }],
          },
        }),
      };

      (puter.ai.chat as jest.Mock).mockResolvedValue(mockResponse);

      const mockProducts = [
        { id: 'product-1', name: 'Café Americano', isActive: true },
      ];

      mockPrisma.product.findMany.mockResolvedValue(mockProducts);

      const mockOrder = {
        id: 'order-uuid',
        status: 'PENDING',
        total: '90',
        items: [],
        createdAt: new Date(),
      };

      mockOrdersService.create.mockResolvedValue(mockOrder);

      const result = await service.processCommand(
        userId,
        'Quiero pedir 2 Café Americano',
      );

      expect(result).toHaveProperty('intent', 'CREATE_ORDER');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('message');
    });

    it('should throw BadRequestException for unrecognized intent', async () => {
      const mockResponse = {
        text: JSON.stringify({
          intent: 'UNKNOWN_ACTION',
          parameters: {},
        }),
      };

      (puter.ai.chat as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        service.processCommand(userId, 'random command'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no products found for order', async () => {
      const mockResponse = {
        text: JSON.stringify({
          intent: 'CREATE_ORDER',
          parameters: {
            items: [{ productName: 'Nonexistent', quantity: 1 }],
          },
        }),
      };

      (puter.ai.chat as jest.Mock).mockResolvedValue(mockResponse);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.processCommand(userId, 'Quiero pedir producto que no existe'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when Puter returns empty response', async () => {
      (puter.ai.chat as jest.Mock).mockResolvedValue(null);

      await expect(
        service.processCommand(userId, 'test command'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
