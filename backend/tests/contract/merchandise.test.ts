import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testClient } from 'hono/testing';
import { app } from '../../src/index';

describe('商品API契約テスト', () => {
  beforeAll(async () => {
    // テストデータベースのセットアップ
  });

  afterAll(async () => {
    // テストデータベースのクリーンアップ
  });

  describe('POST /merchandise', () => {
    it('新しい商品アイテムを作成できること', async () => {
      const client = testClient(app);

      const merchandiseInput = {
        name: '特製ラーメン',
        price: 800,
        type: 'BASE_ITEM',
        isAvailable: true,
      };

      const response = await client.merchandise.$post({
        json: merchandiseInput,
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('特製ラーメン');
      expect(data.price).toBe(800);
      expect(data.type).toBe('BASE_ITEM');
      expect(data.isAvailable).toBe(true);
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');
    });

    it('無効な商品タイプを拒否すること', async () => {
      const client = testClient(app);

      const invalidInput = {
        name: 'Invalid Item',
        price: 100,
        type: 'INVALID_TYPE',
        isAvailable: true,
      };

      const response = await client.merchandise.$post({
        json: invalidInput,
      });

      expect(response.status).toBe(400);
    });

    it('割引の負の価格を処理できること', async () => {
      const client = testClient(app);

      const discountInput = {
        name: 'SNS割引',
        price: -50,
        type: 'DISCOUNT',
        isAvailable: true,
      };

      const response = await client.merchandise.$post({
        json: discountInput,
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.price).toBe(-50);
      expect(data.type).toBe('DISCOUNT');
    });
  });

  describe('GET /merchandise', () => {
    it('すべての商品アイテムのリストを返すこと', async () => {
      const client = testClient(app);

      const response = await client.merchandise.$get();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // If there are items, check the structure
      if (data.length > 0) {
        const item = data[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('price');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('isAvailable');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('updatedAt');
      }
    });

    it('商品が存在しない場合は空の配列を返すこと', async () => {
      const client = testClient(app);

      const response = await client.merchandise.$get();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('フィルタした場合は利用可能なアイテムのみを返すこと', async () => {
      const client = testClient(app);

      const response = await client.merchandise.$get({
        query: { available: 'true' },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);

      // All returned items should be available
      data.forEach((item: any) => {
        expect(item.isAvailable).toBe(true);
      });
    });
  });

  describe('POST /merchandise/{merchandiseId}/prices', () => {
    it('既存の商品に新しい価格を設定できること', async () => {
      const client = testClient(app);

      // First create a merchandise item
      const merchandiseInput = {
        name: 'Test Ramen',
        price: 800,
        type: 'BASE_ITEM',
        isAvailable: true,
      };

      const createResponse = await client.merchandise.$post({
        json: merchandiseInput,
      });

      const merchandise = await createResponse.json();
      const merchandiseId = merchandise.id;

      // Now set a new price
      const priceInput = {
        price: 900,
        since: new Date().toISOString(),
      };

      const response = await client.merchandise[':merchandiseId'].prices.$post({
        param: { merchandiseId },
        json: priceInput,
      });

      expect(response.status).toBe(201);
    });

    it('存在しない商品の価格更新を拒否すること', async () => {
      const client = testClient(app);

      const priceInput = {
        price: 900,
        since: new Date().toISOString(),
      };

      const response = await client.merchandise[':merchandiseId'].prices.$post({
        param: { merchandiseId: '00000000-0000-0000-0000-000000000000' },
        json: priceInput,
      });

      expect(response.status).toBe(404);
    });

    it('割引の負の価格を処理できること', async () => {
      const client = testClient(app);

      // First create a discount merchandise item
      const merchandiseInput = {
        name: 'Test Discount',
        price: -50,
        type: 'DISCOUNT',
        isAvailable: true,
      };

      const createResponse = await client.merchandise.$post({
        json: merchandiseInput,
      });

      const merchandise = await createResponse.json();
      const merchandiseId = merchandise.id;

      // Update the discount price
      const priceInput = {
        price: -100,
        since: new Date().toISOString(),
      };

      const response = await client.merchandise[':merchandiseId'].prices.$post({
        param: { merchandiseId },
        json: priceInput,
      });

      expect(response.status).toBe(201);
    });
  });
});
