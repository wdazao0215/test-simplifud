import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
};

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => mockOpenAI),
  };
});

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;
  let ordersService: OrdersService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'test-api-key';
      return null;
    }),
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

    it('should throw BadRequestException when OpenAI API key is not configured', async () => {
      const mockConfigWithoutKey = {
        get: jest.fn((key: string) => {
          if (key === 'OPENAI_API_KEY') return undefined;
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: ConfigService, useValue: mockConfigWithoutKey },
          { provide: ProductsService, useValue: mockProductsService },
          { provide: OrdersService, useValue: mockOrdersService },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const serviceWithoutKey = module.get<AiService>(AiService);

      await expect(
        serviceWithoutKey.processCommand(userId, 'test command'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process CREATE_PRODUCT command successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'CREATE_PRODUCT',
                parameters: {
                  name: 'Latte de Vainilla',
                  description: 'Delicioso latte con vainilla',
                  price: 55,
                  stock: 80,
                },
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

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
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'CREATE_ORDER',
                parameters: {
                  items: [{ productName: 'Café Americano', quantity: 2 }],
                },
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

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
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'UNKNOWN_ACTION',
                parameters: {},
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(
        service.processCommand(userId, 'random command'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no products found for order', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: 'CREATE_ORDER',
                parameters: {
                  items: [{ productName: 'Nonexistent', quantity: 1 }],
                },
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);
      mockPrisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.processCommand(userId, 'Quiero pedir producto que no existe'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OpenAI returns empty response', async () => {
      const mockResponse = {
        choices: [],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      await expect(
        service.processCommand(userId, 'test command'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
