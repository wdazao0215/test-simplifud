import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let httpServer;
  let authToken: string;
  let testUserId: string;

  const testUser = {
    email: 'order@test.com',
    password: 'password123',
    name: 'Order Test User',
    role: 'CUSTOMER' as const,
  };

  beforeAll(async () => {
    prisma = new PrismaClient();

    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      update: {},
      create: {
        ...testUser,
        password: hashedPassword,
      },
    });
    testUserId = user.id;

    const products = await prisma.product.createManyAndReturn({
      data: [
        { name: 'Café Test 1', price: 45.0, stock: 100, isActive: true },
        { name: 'Café Test 2', price: 55.0, stock: 80, isActive: true },
        { name: 'Café Test 3', price: 50.0, stock: 1, isActive: true },
        { name: 'Café Inactivo', price: 40.0, stock: 50, isActive: false },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany({ where: { name: { contains: 'Test' } } });
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
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await app.close();
  });

  describe('/orders (POST)', () => {
    it('should return 401 without auth token', async () => {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 1,
      });

      await require('supertest')(httpServer)
        .post('/orders')
        .send({
          items: [{ productId: products[0].id, quantity: 1 }],
        })
        .expect(401);
    });

    it('should create order successfully', async () => {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 2,
      });

      const response = await require('supertest')(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: products[0].id, quantity: 2 },
            { productId: products[1].id, quantity: 1 },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 404 for non-existent product', async () => {
      const response = await require('supertest')(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: 'non-existent-uuid', quantity: 1 }],
        })
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('no encontrados');
    });

    it('should return 400 for insufficient stock', async () => {
      const product = await prisma.product.findFirst({
        where: { name: 'Café Test 3' },
      });

      const response = await require('supertest')(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: product.id, quantity: 100 }],
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Stock insuficiente');
    });

    it('should return 400 for inactive product', async () => {
      const product = await prisma.product.findFirst({
        where: { name: 'Café Inactivo' },
      });

      const response = await require('supertest')(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: product.id, quantity: 1 }],
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('no está disponible');
    });

    it('should calculate total correctly', async () => {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 2,
      });

      const response = await require('supertest')(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { productId: products[0].id, quantity: 2 },
            { productId: products[1].id, quantity: 1 },
          ],
        })
        .expect(201);

      const expectedTotal =
        Number(products[0].price) * 2 + Number(products[1].price);
      expect(Number(response.body.total)).toBe(expectedTotal);
    });
  });

  describe('/orders (GET)', () => {
    it('should return 401 without auth token', async () => {
      await require('supertest')(httpServer).get('/orders').expect(401);
    });

    it('should return empty array when no orders exist', async () => {
      const response = await require('supertest')(httpServer)
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return user orders', async () => {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        take: 1,
      });

      await require('supertest')(httpServer)
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [{ productId: products[0].id, quantity: 1 }],
        })
        .expect(201);

      const response = await require('supertest')(httpServer)
        .get('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
