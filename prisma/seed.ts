import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const customerPassword = await bcrypt.hash('customer123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@simplifud.com' },
    update: {},
    create: {
      email: 'admin@simplifud.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@simplifud.com' },
    update: {},
    create: {
      email: 'customer@simplifud.com',
      password: customerPassword,
      name: 'John Doe',
      role: 'CUSTOMER',
    },
  });
  console.log('Created customer user:', customer.email);

  const products = [
    {
      name: 'Café Americano',
      description: 'Café negro sin azúcar',
      price: 45.0,
      stock: 100,
      isActive: true,
    },
    {
      name: 'Latte de Vainilla',
      description: 'Café con leche y vainilla',
      price: 55.0,
      stock: 80,
      isActive: true,
    },
    {
      name: 'Capuccino',
      description: 'Café con espuma de leche',
      price: 50.0,
      stock: 75,
      isActive: true,
    },
    {
      name: 'Mocha',
      description: 'Café con chocolate y crema',
      price: 60.0,
      stock: 60,
      isActive: true,
    },
    {
      name: 'Té Verde',
      description: 'Té verde natural',
      price: 35.0,
      stock: 120,
      isActive: true,
    },
    {
      name: 'Jugo de Naranja',
      description: 'Jugo natural de naranja',
      price: 40.0,
      stock: 50,
      isActive: true,
    },
    {
      name: 'Croissant',
      description: 'Pan francés hojaldrado',
      price: 30.0,
      stock: 40,
      isActive: true,
    },
    {
      name: 'Muffin de Chocolate',
      description: 'Muffin con chips de chocolate',
      price: 35.0,
      stock: 35,
      isActive: true,
    },
    {
      name: 'Sandwich de Jamón',
      description: 'Sandwich con jamón y queso',
      price: 65.0,
      stock: 25,
      isActive: true,
    },
    {
      name: 'Ensalada César',
      description: 'Ensalada con pollo y aderezo César',
      price: 85.0,
      stock: 20,
      isActive: true,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });
    if (!existing) {
      await prisma.product.create({ data: product });
    }
  }
  console.log('Seeded products:', products.length);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
