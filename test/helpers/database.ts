import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function cleanupDatabase() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

export async function createTestUser(role: 'ADMIN' | 'CUSTOMER' = 'CUSTOMER') {
  const hashedPassword = await bcrypt.hash('test123456', 10);
  return prisma.user.create({
    data: {
      email: role === 'ADMIN' ? 'admin@test.com' : 'customer@test.com',
      password: hashedPassword,
      name: role === 'ADMIN' ? 'Admin Test' : 'Customer Test',
      role,
    },
  });
}

export async function createTestProducts() {
  const products = [
    { name: 'Café Americano', price: 45.0, stock: 100, isActive: true },
    { name: 'Latte', price: 55.0, stock: 80, isActive: true },
    { name: 'Capuccino', price: 50.0, stock: 75, isActive: true },
    { name: 'Mocha', price: 60.0, stock: 60, isActive: false },
  ];

  return prisma.product.createMany({ data: products });
}

export async function getActiveProducts() {
  return prisma.product.findMany({ where: { isActive: true } });
}

export { prisma };
