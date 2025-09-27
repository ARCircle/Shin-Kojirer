import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/lib/db';

beforeAll(async () => {
  // データベース接続を確立
  await prisma.$connect();
});

afterAll(async () => {
  // データベース接続を切断
  await prisma.$disconnect();
});

beforeEach(async () => {
  // 各テスト前にデータベースをクリーンアップ（依存関係の順序で削除）
  await prisma.orderItem.deleteMany();
  await prisma.orderItemGroup.deleteMany();
  await prisma.order.deleteMany();
  await prisma.merchandise.deleteMany();
});
