import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 既存データをクリア
  await prisma.orderItem.deleteMany();
  await prisma.orderItemGroup.deleteMany();
  await prisma.order.deleteMany();
  await prisma.merchandise.deleteMany();

  // ===============================================
  // 商品マスタデータの作成
  // ===============================================
  console.log('Creating merchandise...');

  // BASE_ITEM（こうじらー - サイズ別）
  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-0737-ae8f-4aa2f604155c',
      name: 'こうじらー（小）',
      price: 400,
      type: 'BASE_ITEM',
      isAvailable: true,
    },
  });

  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-0cd7-a31f-e7ac2eb0c81f',
      name: 'こうじらー（中）',
      price: 500,
      type: 'BASE_ITEM',
      isAvailable: true,
    },
  });

  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-8147-af5a-b976c7081f81',
      name: 'こうじらー（大）',
      price: 600,
      type: 'BASE_ITEM',
      isAvailable: true,
    },
  });

  // TOPPING（トッピング）
  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-2a97-9324-2df8785b787f',
      name: 'マヨ',
      price: 50,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-2f87-8e2e-9b04d2137e87',
      name: 'カレー粉',
      price: 50,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-b117-9da4-b484bffed39f',
      name: 'コショウ',
      price: 50,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-3927-8d9c-7e9bdcfd4aa1',
      name: 'フライドオニオン',
      price: 50,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  // DISCOUNT（RTクーポン - トッピング1つ無料）
  await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7581-1cd7-a31f-e7ac2eb0c82f',
      name: 'RTクーポン（トッピング1つ無料）',
      price: -50,
      type: 'DISCOUNT',
      isAvailable: true,
    },
  });

  console.log('Created 8 merchandise items');
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
