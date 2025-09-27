import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testClient } from 'hono/testing';
import { app } from '../../src/index';

describe('注文API契約テスト', () => {
  beforeAll(async () => {
    // テストデータベースのセットアップ
  });

  afterAll(async () => {
    // テストデータベースのクリーンアップ
  });

  describe('POST /orders', () => {
    it('1つのグループに複数のアイテムを含む新しい注文を作成できること', async () => {
      const client = testClient(app);

      const orderInput = {
        groups: [
          {
            items: [
              { merchandiseId: 'merch_ramen_01' },
              { merchandiseId: 'merch_pork_02' },
              { merchandiseId: 'merch_discount_03' },
            ],
          },
        ],
      };

      const response = await client.orders.$post({
        json: orderInput,
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('callNum');
      expect(data.status).toBe('ORDERED');
      expect(data).toHaveProperty('groups');
      expect(Array.isArray(data.groups)).toBe(true);
      expect(data.groups).toHaveLength(1);

      const group = data.groups[0];
      expect(group).toHaveProperty('id');
      expect(group.status).toBe('NOT_READY');
      expect(group).toHaveProperty('items');
      expect(Array.isArray(group.items)).toBe(true);
      expect(group.items).toHaveLength(3);

      group.items.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('merchandiseId');
      });
    });

    it('複数のグループで新しい注文を作成できること', async () => {
      const client = testClient(app);

      const orderInput = {
        groups: [
          {
            items: [
              { merchandiseId: 'merch_ramen_01' },
              { merchandiseId: 'merch_pork_02' },
            ],
          },
          {
            items: [
              { merchandiseId: 'merch_ramen_01' },
              { merchandiseId: 'merch_discount_03' },
            ],
          },
        ],
      };

      const response = await client.orders.$post({
        json: orderInput,
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data).toHaveProperty('groups');
      expect(data.groups).toHaveLength(2);

      data.groups.forEach((group: any) => {
        expect(group).toHaveProperty('id');
        expect(group.status).toBe('NOT_READY');
        expect(group).toHaveProperty('items');
        expect(Array.isArray(group.items)).toBe(true);
      });
    });

    it('空の注文を拒否すること', async () => {
      const client = testClient(app);

      const orderInput = {
        groups: [],
      };

      const response = await client.orders.$post({
        json: orderInput,
      });

      expect(response.status).toBe(400);
    });

    it('アイテムのないグループを拒否すること', async () => {
      const client = testClient(app);

      const orderInput = {
        groups: [
          {
            items: [],
          },
        ],
      };

      const response = await client.orders.$post({
        json: orderInput,
      });

      expect(response.status).toBe(400);
    });

    it('連続する呼び出し番号を生成すること', async () => {
      const client = testClient(app);

      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const response1 = await client.orders.$post({
        json: orderInput,
      });
      const order1 = await response1.json();

      const response2 = await client.orders.$post({
        json: orderInput,
      });
      const order2 = await response2.json();

      expect(order2.callNum).toBeGreaterThan(order1.callNum);
    });
  });

  describe('GET /orders/{orderId}', () => {
    it('すべてのグループとアイテムを含む注文詳細を返すこと', async () => {
      const client = testClient(app);

      // First create an order
      const orderInput = {
        groups: [
          {
            items: [
              { merchandiseId: 'merch_ramen_01' },
              { merchandiseId: 'merch_pork_02' },
            ],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;

      // Now get the order details
      const response = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(orderId);
      expect(data).toHaveProperty('callNum');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('groups');
      expect(data).toHaveProperty('createdAt');
      expect(data).toHaveProperty('updatedAt');

      expect(Array.isArray(data.groups)).toBe(true);
      expect(data.groups).toHaveLength(1);

      const group = data.groups[0];
      expect(group).toHaveProperty('id');
      expect(group).toHaveProperty('status');
      expect(group).toHaveProperty('items');
      expect(Array.isArray(group.items)).toBe(true);
      expect(group.items).toHaveLength(2);

      group.items.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('merchandiseId');
      });
    });

    it('存在しない注文に対して404を返すこと', async () => {
      const client = testClient(app);

      const response = await client.orders[':orderId'].$get({
        param: { orderId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.status).toBe(404);
    });

    it('現在のステータス更新を含む注文を返すこと', async () => {
      const client = testClient(app);

      // Create and pay for an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;

      // Pay for the order
      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      // Get the updated order
      const response = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('PAID');
    });
  });

  describe('POST /orders/{orderId}/pay', () => {
    it('注文を支払い済みとしてマークできること', async () => {
      const client = testClient(app);

      // First create an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;

      // Pay for the order
      const response = await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(orderId);
      expect(data.status).toBe('PAID');

      // Verify the order status is updated
      const getResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      const updatedOrder = await getResponse.json();
      expect(updatedOrder.status).toBe('PAID');
    });

    it('存在しない注文に対して404を返すこと', async () => {
      const client = testClient(app);

      const response = await client.orders[':orderId'].pay.$post({
        param: { orderId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.status).toBe(404);
    });

    it('複数の支払い試行を適切に処理できること', async () => {
      const client = testClient(app);

      // Create an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;

      // First payment
      const response1 = await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });
      expect(response1.status).toBe(200);

      // Second payment attempt should still succeed (idempotent)
      const response2 = await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });
      expect(response2.status).toBe(200);

      const data = await response2.json();
      expect(data.status).toBe('PAID');
    });

    it('ORDEREDからPAIDへステータスを遷移できること', async () => {
      const client = testClient(app);

      // Create an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;

      expect(createdOrder.status).toBe('ORDERED');

      // Pay for the order
      const response = await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('PAID');
      expect(data.updatedAt).not.toBe(createdOrder.updatedAt);
    });
  });

  describe('POST /order-item-groups/{groupId}/prepare', () => {
    it('アイテムグループを準備中としてマークできること', async () => {
      const client = testClient(app);

      // Create and pay for an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const groupId = createdOrder.groups[0].id;

      // Pay for the order first
      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      // Mark the group as preparing
      const response = await client['order-item-groups'][
        ':groupId'
      ].prepare.$post({
        param: { groupId },
      });

      expect(response.status).toBe(200);

      // Verify the group status changed
      const getResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      const updatedOrder = await getResponse.json();
      const updatedGroup = updatedOrder.groups.find(
        (g: any) => g.id === groupId
      );
      expect(updatedGroup.status).toBe('PREPARING');
    });

    it('存在しないグループに対して404を返すこと', async () => {
      const client = testClient(app);

      const response = await client['order-item-groups'][
        ':groupId'
      ].prepare.$post({
        param: { groupId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.status).toBe(404);
    });

    it('複数の準備リクエストを適切に処理できること', async () => {
      const client = testClient(app);

      // Create, pay, and prepare an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const groupId = createdOrder.groups[0].id;

      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      // First prepare request
      const response1 = await client['order-item-groups'][
        ':groupId'
      ].prepare.$post({
        param: { groupId },
      });
      expect(response1.status).toBe(200);

      // Second prepare request should still succeed (idempotent)
      const response2 = await client['order-item-groups'][
        ':groupId'
      ].prepare.$post({
        param: { groupId },
      });
      expect(response2.status).toBe(200);
    });

    it('NOT_READYからPREPARINGへグループステータスを遷移できること', async () => {
      const client = testClient(app);

      // Create an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const groupId = createdOrder.groups[0].id;

      // Verify initial status
      expect(createdOrder.groups[0].status).toBe('NOT_READY');

      // Pay for the order
      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      // Mark as preparing
      const response = await client['order-item-groups'][
        ':groupId'
      ].prepare.$post({
        param: { groupId },
      });

      expect(response.status).toBe(200);

      // Verify status change
      const getResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      const updatedOrder = await getResponse.json();
      const updatedGroup = updatedOrder.groups.find(
        (g: any) => g.id === groupId
      );
      expect(updatedGroup.status).toBe('PREPARING');
    });
  });

  describe('POST /order-item-groups/{groupId}/ready', () => {
    it('アイテムグループを準備完了としてマークできること', async () => {
      const client = testClient(app);

      // Create, pay, and prepare an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const groupId = createdOrder.groups[0].id;

      // Pay and prepare the order
      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      await client['order-item-groups'][':groupId'].prepare.$post({
        param: { groupId },
      });

      // Mark the group as ready
      const response = await client['order-item-groups'][
        ':groupId'
      ].ready.$post({
        param: { groupId },
      });

      expect(response.status).toBe(200);

      // Verify the group status changed
      const getResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      const updatedOrder = await getResponse.json();
      const updatedGroup = updatedOrder.groups.find(
        (g: any) => g.id === groupId
      );
      expect(updatedGroup.status).toBe('READY');
    });

    it('存在しないグループに対して404を返すこと', async () => {
      const client = testClient(app);

      const response = await client['order-item-groups'][
        ':groupId'
      ].ready.$post({
        param: { groupId: '00000000-0000-0000-0000-000000000000' },
      });

      expect(response.status).toBe(404);
    });

    it('複数の準備完了リクエストを適切に処理できること', async () => {
      const client = testClient(app);

      // Create, pay, prepare an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const groupId = createdOrder.groups[0].id;

      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      await client['order-item-groups'][':groupId'].prepare.$post({
        param: { groupId },
      });

      // First ready request
      const response1 = await client['order-item-groups'][
        ':groupId'
      ].ready.$post({
        param: { groupId },
      });
      expect(response1.status).toBe(200);

      // Second ready request should still succeed (idempotent)
      const response2 = await client['order-item-groups'][
        ':groupId'
      ].ready.$post({
        param: { groupId },
      });
      expect(response2.status).toBe(200);
    });

    it('PREPARINGからREADYへグループステータスを遷移できること', async () => {
      const client = testClient(app);

      // Create, pay, and prepare an order
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const groupId = createdOrder.groups[0].id;

      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      await client['order-item-groups'][':groupId'].prepare.$post({
        param: { groupId },
      });

      // Verify current status is PREPARING
      const beforeResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });
      const beforeOrder = await beforeResponse.json();
      const beforeGroup = beforeOrder.groups.find((g: any) => g.id === groupId);
      expect(beforeGroup.status).toBe('PREPARING');

      // Mark as ready
      const response = await client['order-item-groups'][
        ':groupId'
      ].ready.$post({
        param: { groupId },
      });

      expect(response.status).toBe(200);

      // Verify status change
      const afterResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });

      const afterOrder = await afterResponse.json();
      const afterGroup = afterOrder.groups.find((g: any) => g.id === groupId);
      expect(afterGroup.status).toBe('READY');
    });

    it('すべてのグループが準備完了したときに注文ステータスを更新できること', async () => {
      const client = testClient(app);

      // Create an order with two groups
      const orderInput = {
        groups: [
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
          {
            items: [{ merchandiseId: 'merch_ramen_01' }],
          },
        ],
      };

      const createResponse = await client.orders.$post({
        json: orderInput,
      });

      const createdOrder = await createResponse.json();
      const orderId = createdOrder.id;
      const group1Id = createdOrder.groups[0].id;
      const group2Id = createdOrder.groups[1].id;

      // Pay for the order
      await client.orders[':orderId'].pay.$post({
        param: { orderId },
      });

      // Prepare both groups
      await client['order-item-groups'][':groupId'].prepare.$post({
        param: { groupId: group1Id },
      });
      await client['order-item-groups'][':groupId'].prepare.$post({
        param: { groupId: group2Id },
      });

      // Mark first group as ready
      await client['order-item-groups'][':groupId'].ready.$post({
        param: { groupId: group1Id },
      });

      // Order should still be PAID (not all groups ready)
      const partialResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });
      const partialOrder = await partialResponse.json();
      expect(partialOrder.status).toBe('PAID');

      // Mark second group as ready
      await client['order-item-groups'][':groupId'].ready.$post({
        param: { groupId: group2Id },
      });

      // Order should now be READY (all groups ready)
      const finalResponse = await client.orders[':orderId'].$get({
        param: { orderId },
      });
      const finalOrder = await finalResponse.json();
      expect(finalOrder.status).toBe('READY');
    });
  });
});
