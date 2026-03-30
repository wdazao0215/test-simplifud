import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductRepository } from './repositories/product.repository';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: ProductRepository;

  const mockProductRepository = {
    findActiveProducts: jest.fn(),
    findById: jest.fn(),
    findByIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: mockProductRepository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get<ProductRepository>(ProductRepository);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Café Americano',
        description: 'Café negro',
        price: '45.00',
        stock: 100,
      },
      {
        id: 'product-2',
        name: 'Latte',
        description: 'Café con leche',
        price: '55.00',
        stock: 80,
      },
    ];

    it('should return paginated active products', async () => {
      const paginatedResult = {
        data: mockProducts,
        meta: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockProductRepository.findActiveProducts.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });

    it('should filter products by search term', async () => {
      const paginatedResult = {
        data: [mockProducts[0]],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockProductRepository.findActiveProducts.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'Americano',
      });

      expect(mockProductRepository.findActiveProducts).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'Americano',
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toContain('Americano');
    });

    it('should return empty array when no products found', async () => {
      const paginatedResult = {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      };

      mockProductRepository.findActiveProducts.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAll({
        page: 1,
        limit: 10,
        search: 'nonexistent',
      });

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      const paginatedResult = {
        data: [],
        meta: {
          total: 25,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
      };

      mockProductRepository.findActiveProducts.mockResolvedValue(
        paginatedResult,
      );

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const mockProduct = {
        id: 'product-1',
        name: 'Café Americano',
        price: '45.00',
        stock: 100,
        isActive: true,
      };

      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const result = await service.findById('product-1');

      expect(result).toEqual(mockProduct);
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-1');
    });

    it('should return null when product not found', async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      const result = await service.findById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('should return products by ids', async () => {
      const mockProducts = [
        { id: 'product-1', name: 'Café 1', isActive: true },
        { id: 'product-2', name: 'Café 2', isActive: true },
      ];

      mockProductRepository.findByIds.mockResolvedValue(mockProducts);

      const result = await service.findByIds(['product-1', 'product-2']);

      expect(result).toHaveLength(2);
      expect(mockProductRepository.findByIds).toHaveBeenCalledWith([
        'product-1',
        'product-2',
      ]);
    });

    it('should return empty array when no products found', async () => {
      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await service.findByIds(['invalid-1', 'invalid-2']);

      expect(result).toHaveLength(0);
    });
  });
});
