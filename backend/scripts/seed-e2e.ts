import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedE2EData() {
  // 既存データをクリア
  await prisma.orderItem.deleteMany();
  await prisma.orderItemGroup.deleteMany();
  await prisma.order.deleteMany();
  await prisma.merchandise.deleteMany();

  console.log('🗑️  Cleared existing data');

  // メイン商品を作成
  const baseItems = await Promise.all([
    prisma.merchandise.create({
      data: {
        name: '醤油ラーメン',
        price: 800,
        type: 'BASE_ITEM',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: '味噌ラーメン',
        price: 850,
        type: 'BASE_ITEM',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: '塩ラーメン',
        price: 750,
        type: 'BASE_ITEM',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: 'つけ麺',
        price: 950,
        type: 'BASE_ITEM',
        isAvailable: true,
      },
    }),
  ]);

  console.log('🍜 Created base items:', baseItems.length);

  // トッピングを作成
  const toppings = await Promise.all([
    prisma.merchandise.create({
      data: {
        name: 'チャーシュー',
        price: 200,
        type: 'TOPPING',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: 'ネギ',
        price: 100,
        type: 'TOPPING',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: 'メンマ',
        price: 150,
        type: 'TOPPING',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: '半熟卵',
        price: 120,
        type: 'TOPPING',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: '海苔',
        price: 80,
        type: 'TOPPING',
        isAvailable: true,
      },
    }),
  ]);

  console.log('🥢 Created toppings:', toppings.length);

  // 割引を作成
  const discounts = await Promise.all([
    prisma.merchandise.create({
      data: {
        name: '学生割引',
        price: -100,
        type: 'DISCOUNT',
        isAvailable: true,
      },
    }),
    prisma.merchandise.create({
      data: {
        name: 'ランチタイム割引',
        price: -50,
        type: 'DISCOUNT',
        isAvailable: true,
      },
    }),
  ]);

  console.log('💰 Created discounts:', discounts.length);

  // 総計表示
  console.log('✅ E2E seed data created successfully!');
  console.log(
    `   📊 Total items: ${baseItems.length + toppings.length + discounts.length}`
  );
  console.log(`   🍜 Base items: ${baseItems.length}`);
  console.log(`   🥢 Toppings: ${toppings.length}`);
  console.log(`   💰 Discounts: ${discounts.length}`);

  return {
    baseItems,
    toppings,
    discounts,
  };
}

if (require.main === module) {
  seedE2EData()
    .then(() => {
      console.log('🎉 Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedE2EData };
