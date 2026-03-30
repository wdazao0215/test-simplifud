import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let httpServer;

  const testUser = {
    email: 'test@e2e.com',
    password: 'password123',
    name: 'Test User',
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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/auth/login (POST)', () => {
    it('should return JWT token on valid credentials', async () => {
      const response = await require('supertest')(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.role).toBe('CUSTOMER');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      const response = await require('supertest')(httpServer)
        .post('/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    it('should return 401 for invalid password', async () => {
      const response = await require('supertest')(httpServer)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Credenciales inválidas');
    });

    it('should return 400 for missing email', async () => {
      const response = await require('supertest')(httpServer)
        .post('/auth/login')
        .send({
          password: testUser.password,
        })
        .expect(400);
    });
  });
});
