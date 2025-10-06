import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 既存データをクリア
  await prisma.orderItem.deleteMany();
  await prisma.orderItemGroup.deleteMany();
  await prisma.order.deleteMany();
  await prisma.merchandise.deleteMany();

  // 商品マスタデータの作成
  console.log('Creating merchandise...');

  // BASE_ITEM（メイン商品）
  const ramen = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-0737-ae8f-4aa2f604155c',
      name: '特製ラーメン',
      price: 800,
      type: 'BASE_ITEM',
      isAvailable: true,
    },
  });

  const chashu_ramen = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-0cd7-a31f-e7ac2eb0c81f',
      name: 'チャーシューラーメン',
      price: 1000,
      type: 'BASE_ITEM',
      isAvailable: true,
    },
  });

  const miso_ramen = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-8147-af5a-b976c7081f81',
      name: '味噌ラーメン',
      price: 850,
      type: 'BASE_ITEM',
      isAvailable: true,
    },
  });

  // TOPPING（トッピング）
  const chashu = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-2a97-9324-2df8785b787f',
      name: 'チャーシュー',
      price: 150,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  const ajitama = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-5ad7-8061-2c557bab9c07',
      name: '味玉',
      price: 100,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  const nori = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-2f87-8e2e-9b04d2137e87',
      name: '海苔',
      price: 50,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  const corn = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-b117-9da4-b484bffed39f',
      name: 'コーン',
      price: 80,
      type: 'TOPPING',
      isAvailable: true,
    },
  });

  const butter = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7580-3927-8d9c-7e9bdcfd4aa1',
      name: 'バター',
      price: 50,
      type: 'TOPPING',
      isAvailable: false, // 利用不可のテストデータ
    },
  });

  // DISCOUNT（割引）
  const sns_discount = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7581-0737-ae8f-4aa2f604155c',
      name: 'SNS割引',
      price: -50,
      type: 'DISCOUNT',
      isAvailable: true,
    },
  });

  const student_discount = await prisma.merchandise.create({
    data: {
      id: '0192d8ca-7581-0cd7-a31f-e7ac2eb0c81f',
      name: '学生割引',
      price: -100,
      type: 'DISCOUNT',
      isAvailable: true,
    },
  });

  console.log('✅ Merchandise created');

  // 注文データの作成
  console.log('Creating orders...');

  // 注文1: 完了済み（過去の注文）
  const order1 = await prisma.order.create({
    data: {
      id: '01937fd1-2810-9df7-895b-9f32bcb27be6',
      callNum: 1,
      status: 'READY',
      createdAt: new Date('2024-12-01T10:23:54+09:00'),
    },
  });

  // 注文1のグループ1: 特製ラーメン + チャーシュー
  const order1Group1 = await prisma.orderItemGroup.create({
    data: {
      id: '01937fd1-2810-8cb7-b11f-d0d3825c71dd',
      orderId: order1.id,
      status: 'READY',
      createdAt: new Date('2024-12-01T10:23:54+09:00'),
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderItemGroupId: order1Group1.id,
        merchandiseId: ramen.id,
      },
      {
        orderItemGroupId: order1Group1.id,
        merchandiseId: chashu.id,
      },
    ],
  });

  // 注文2: 現在進行中（支払い済み、調理中）
  const order2 = await prisma.order.create({
    data: {
      id: '0197c8be-1570-9707-8bbb-ca46862ea248',
      callNum: 2,
      status: 'PAID',
      createdAt: new Date(),
    },
  });

  // 注文2のグループ1: チャーシューラーメン + 味玉 + SNS割引
  const order2Group1 = await prisma.orderItemGroup.create({
    data: {
      id: '0197c8be-1570-6597-9217-7e968b9041b5',
      orderId: order2.id,
      status: 'PREPARING',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderItemGroupId: order2Group1.id,
        merchandiseId: chashu_ramen.id,
      },
      {
        orderItemGroupId: order2Group1.id,
        merchandiseId: ajitama.id,
      },
      {
        orderItemGroupId: order2Group1.id,
        merchandiseId: sns_discount.id,
      },
    ],
  });

  // 注文2のグループ2: 味噌ラーメン + 海苔 + コーン
  const order2Group2 = await prisma.orderItemGroup.create({
    data: {
      id: '0197c8be-1570-aba7-8305-6b7b365e9d42',
      orderId: order2.id,
      status: 'NOT_READY',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderItemGroupId: order2Group2.id,
        merchandiseId: miso_ramen.id,
      },
      {
        orderItemGroupId: order2Group2.id,
        merchandiseId: nori.id,
      },
      {
        orderItemGroupId: order2Group2.id,
        merchandiseId: corn.id,
      },
    ],
  });

  // 注文3: 複雑な注文（複数グループ、様々なステータス）
  const order3 = await prisma.order.create({
    data: {
      id: '0198633e-ecc8-f9d7-949d-670afeb2932c',
      callNum: 3,
      status: 'PAID',
    },
  });

  // 注文3のグループ1: 特製ラーメンのみ（調理完了）
  const order3Group1 = await prisma.orderItemGroup.create({
    data: {
      id: '0198633e-ecc8-89a7-a5c8-5163c354d0a9',
      orderId: order3.id,
      status: 'READY',
    },
  });

  await prisma.orderItem.create({
    data: {
      orderItemGroupId: order3Group1.id,
      merchandiseId: ramen.id,
    },
  });

  // 注文3のグループ2: チャーシューラーメン + 複数トッピング（調理中）
  const order3Group2 = await prisma.orderItemGroup.create({
    data: {
      id: '0198633e-ecc8-5e77-a466-8f7e1cd063fa',
      orderId: order3.id,
      status: 'PREPARING',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderItemGroupId: order3Group2.id,
        merchandiseId: chashu_ramen.id,
      },
      {
        orderItemGroupId: order3Group2.id,
        merchandiseId: ajitama.id,
      },
      {
        orderItemGroupId: order3Group2.id,
        merchandiseId: nori.id,
      },
      {
        orderItemGroupId: order3Group2.id,
        merchandiseId: corn.id,
      },
    ],
  });

  // 注文3のグループ3: 味噌ラーメン + 学生割引（未調理）
  const order3Group3 = await prisma.orderItemGroup.create({
    data: {
      id: '0198633e-ecc8-55f7-aaa1-9b92e5fe88fc',
      orderId: order3.id,
      status: 'NOT_READY',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderItemGroupId: order3Group3.id,
        merchandiseId: miso_ramen.id,
      },
      {
        orderItemGroupId: order3Group3.id,
        merchandiseId: student_discount.id,
      },
    ],
  });

  // 注文4: 新しい注文（注文済み状態）
  const order4 = await prisma.order.create({
    data: {
      id: '019902e4-10c8-8c67-99f0-1f1a75abbdae',
      callNum: 4, // 今日の新しい呼び出し番号
      status: 'ORDERED',
    },
  });

  // 注文4のグループ1: 特製ラーメン + チャーシュー + SNS割引
  const order4Group1 = await prisma.orderItemGroup.create({
    data: {
      id: '019902e4-10c8-6d37-8b69-566d7a063a52',
      orderId: order4.id,
      status: 'NOT_READY',
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderItemGroupId: order4Group1.id,
        merchandiseId: ramen.id,
      },
      {
        orderItemGroupId: order4Group1.id,
        merchandiseId: chashu.id,
      },
      {
        orderItemGroupId: order4Group1.id,
        merchandiseId: sns_discount.id,
      },
    ],
  });

  console.log('✅ Orders created');

  // 作成されたデータの確認
  const merchandiseCount = await prisma.merchandise.count();
  const orderCount = await prisma.order.count();
  const groupCount = await prisma.orderItemGroup.count();
  const itemCount = await prisma.orderItem.count();

  console.log('📊 Seed data summary:');
  console.log(`  - Merchandise: ${merchandiseCount} items`);
  console.log(`  - Orders: ${orderCount} orders`);
  console.log(`  - Order Groups: ${groupCount} groups`);
  console.log(`  - Order Items: ${itemCount} items`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
