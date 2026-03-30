import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { OrderRepository } from './repositories/order.repository';
import { ProductsService } from '../products/products.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: OrderRepository;
  let productsService: ProductsService;

  const mockOrderRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByUserIdPaginated: jest.fn(),
  };

  const mockProductsService = {
    findByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<OrderRepository>(OrderRepository);
    productsService = module.get<ProductsService>(ProductsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-uuid';
    const createOrderDto = {
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
    };

    const mockProducts = [
      {
        id: 'product-1',
        name: 'Café Americano',
        price: 45.0,
        stock: 100,
        isActive: true,
      },
      {
        id: 'product-2',
        name: 'Latte',
        price: 55.0,
        stock: 80,
        isActive: true,
      },
    ];

    it('should create an order successfully with valid items', async () => {
      mockProductsService.findByIds.mockResolvedValue(mockProducts);

      const mockOrder = {
        id: 'order-uuid',
        userId,
        status: 'PENDING',
        total: 145,
        createdAt: new Date(),
        items: [
          {
            productId: 'product-1',
            product: { name: 'Café Americano' },
            quantity: 2,
            unitPrice: 45,
          },
          {
            productId: 'product-2',
            product: { name: 'Latte' },
            quantity: 1,
            unitPrice: 55,
          },
        ],
      };

      mockOrderRepository.create.mockResolvedValue(mockOrder);

      const result = await service.create(userId, createOrderDto);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('items');
      expect(result.status).toBe('PENDING');
      expect(mockOrderRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when product not found', async () => {
      mockProductsService.findByIds.mockResolvedValue([mockProducts[0]]);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when product is inactive', async () => {
      const productsWithInactive = [
        {
          ...mockProducts[0],
          isActive: false,
        },
        mockProducts[1],
      ];

      mockProductsService.findByIds.mockResolvedValue(productsWithInactive);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when stock is insufficient', async () => {
      const productsWithLowStock = [
        {
          ...mockProducts[0],
          stock: 1,
        },
        mockProducts[1],
      ];

      mockProductsService.findByIds.mockResolvedValue(productsWithLowStock);

      await expect(service.create(userId, createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate total correctly', async () => {
      mockProductsService.findByIds.mockResolvedValue(mockProducts);

      const mockOrder = {
        id: 'order-uuid',
        userId,
        status: 'PENDING',
        total: 145,
        createdAt: new Date(),
        items: [
          {
            productId: 'product-1',
            product: { name: 'Café Americano' },
            quantity: 2,
            unitPrice: 45,
          },
          {
            productId: 'product-2',
            product: { name: 'Latte' },
            quantity: 1,
            unitPrice: 55,
          },
        ],
      };

      mockOrderRepository.create.mockResolvedValue(mockOrder);

      const result = await service.create(userId, createOrderDto);

      expect(result.total).toBe('145');
    });

    it('should use userId from JWT, not from body', async () => {
      mockProductsService.findByIds.mockResolvedValue(mockProducts);

      const differentUserId = 'different-user-uuid';
      const mockOrder = {
        id: 'order-uuid',
        userId: differentUserId,
        status: 'PENDING',
        total: 145,
        createdAt: new Date(),
        items: [],
      };

      mockOrderRepository.create.mockResolvedValue(mockOrder);

      await service.create(userId, createOrderDto);

      expect(mockOrderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: userId,
        }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return orders for a user', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          userId: 'user-uuid',
          status: 'PENDING',
          total: 100,
          createdAt: new Date(),
          items: [],
        },
      ];

      mockOrderRepository.findByUserId.mockResolvedValue(mockOrders);

      const result = await service.findByUserId('user-uuid');

      expect(result).toHaveLength(1);
      expect(mockOrderRepository.findByUserId).toHaveBeenCalledWith(
        'user-uuid',
      );
    });

    it('should return empty array when no orders found', async () => {
      mockOrderRepository.findByUserId.mockResolvedValue([]);

      const result = await service.findByUserId('user-uuid');

      expect(result).toHaveLength(0);
    });

    it('should return paginated orders when pagination is provided', async () => {
      const paginatedResult = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockOrderRepository.findByUserIdPaginated.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findByUserId('user-uuid', {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(paginatedResult);
      expect(mockOrderRepository.findByUserIdPaginated).toHaveBeenCalledWith(
        'user-uuid',
        { page: 1, limit: 10 },
      );
    });
  });

  describe('findById', () => {
    it('should return an order by id', async () => {
      const mockOrder = {
        id: 'order-uuid',
        userId: 'user-uuid',
        status: 'PENDING',
        items: [],
      };

      mockOrderRepository.findById.mockResolvedValue(mockOrder);

      const result = await service.findById('order-uuid');

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findById).toHaveBeenCalledWith('order-uuid');
    });

    it('should return null when order not found', async () => {
      mockOrderRepository.findById.mockResolvedValue(null);

      const result = await service.findById('invalid-id');

      expect(result).toBeNull();
    });
  });
});
