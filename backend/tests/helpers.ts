import { prisma } from '../src/lib/db';
import { MerchandiseType } from '../src/models/types';

export const createTestMerchandise = async (params?: {
  name?: string;
  price?: number;
  type?: MerchandiseType;
  isAvailable?: boolean;
}) => {
  return await prisma.merchandise.create({
    data: {
      name: params?.name || 'テスト商品',
      price: params?.price || 100,
      type: params?.type || 'BASE_ITEM',
      isAvailable: params?.isAvailable ?? true,
    },
  });
};

export const createTestMerchandiseSet = async () => {
  const ramen = await createTestMerchandise({
    name: '特製ラーメン',
    price: 800,
    type: 'BASE_ITEM',
  });

  const pork = await createTestMerchandise({
    name: 'チャーシュー',
    price: 150,
    type: 'TOPPING',
  });

  const discount = await createTestMerchandise({
    name: 'SNS割引',
    price: -50,
    type: 'DISCOUNT',
  });

  return { ramen, pork, discount };
};
