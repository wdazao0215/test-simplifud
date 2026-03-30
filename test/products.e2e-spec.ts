import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';

describe('Products (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let httpServer;
  let authToken: string;

  const testUser = {
    email: 'product@test.com',
    password: 'password123',
    name: 'Product Test User',
    role: 'CUSTOMER' as const,
  };

  beforeAll(async () => {
    prisma = new PrismaClient();

    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prisma.user.upsert({
      where: { email: testUser.email },
      update: {},
      create: {
        ...testUser,
        password: hashedPassword,
      },
    });

    await prisma.product.createMany({
      data: [
        {
          name: 'Café Americano',
          description: 'Café negro',
          price: 45.0,
          stock: 100,
          isActive: true,
        },
        {
          name: 'Latte',
          description: 'Café con leche',
          price: 55.0,
          stock: 80,
          isActive: true,
        },
        {
          name: 'Capuccino',
          description: 'Con espuma',
          price: 50.0,
          stock: 75,
          isActive: true,
        },
        {
          name: 'Mocha',
          description: 'Con chocolate',
          price: 60.0,
          stock: 60,
          isActive: false,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    httpServer = app.getHttpServer();

    const loginResponse = await require('supertest')(httpServer)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    authToken = loginResponse.body.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/products (GET)', () => {
    it('should return 401 without auth token', async () => {
      await require('supertest')(httpServer).get('/products').expect(401);
    });

    it('should return 200 with valid auth token', async () => {
      const response = await require('supertest')(httpServer)
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return only active products', async () => {
      const response = await require('supertest')(httpServer)
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const inactiveProduct = response.body.data.find(
        (p) => p.name === 'Mocha',
      );
      expect(inactiveProduct).toBeUndefined();
    });

    it('should filter products by search term', async () => {
      const response = await require('supertest')(httpServer)
        .get('/products?search=cafe')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((product) => {
        expect(product.name.toLowerCase()).toContain('café');
      });
    });

    it('should return paginated results', async () => {
      const response = await require('supertest')(httpServer)
        .get('/products?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 2);
    });

    it('should return empty array when no products match search', async () => {
      const response = await require('supertest')(httpServer)
        .get('/products?search=nonexistentproduct123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });
});
