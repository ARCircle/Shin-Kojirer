import { Hono } from 'hono';
import { OrderService } from '../services/orderService';
import { CreateOrderRequestInput, OrderStatus } from '../models/types';

const app = new Hono();
const orderService = new OrderService();

// POST /orders - 新規注文作成
app.post('/', async (c) => {
  try {
    const body = (await c.req.json()) as CreateOrderRequestInput;

    // バリデーション
    if (
      !body.groups ||
      !Array.isArray(body.groups) ||
      body.groups.length === 0
    ) {
      return c.json(
        { error: 'Groups array is required and must not be empty' },
        400
      );
    }

    for (const group of body.groups) {
      if (
        !group.items ||
        !Array.isArray(group.items) ||
        group.items.length === 0
      ) {
        return c.json(
          { error: 'Each group must have items array that is not empty' },
          400
        );
      }

      for (const item of group.items) {
        if (!item.merchandiseId || typeof item.merchandiseId !== 'string') {
          return c.json(
            { error: 'Each item must have a valid merchandiseId' },
            400
          );
        }
      }
    }

    const order = await orderService.createOrder(body);
    return c.json(order, 201);
  } catch (error) {
    console.error('Error creating order:', error);

    if (error instanceof Error) {
      // ビジネスルール違反などの場合は400で返す
      if (
        error.message.includes('validation failed') ||
        error.message.includes('must contain') ||
        error.message.includes('not found') ||
        error.message.includes('Unavailable')
      ) {
        return c.json({ error: error.message }, 400);
      }
    }

    return c.json({ error: 'Failed to create order' }, 500);
  }
});

// GET /orders/:id - 注文詳細取得
app.get('/:orderId', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return c.json({ error: 'Failed to fetch order' }, 500);
  }
});

// GET /orders - 注文一覧取得
app.get('/', async (c) => {
  try {
    const { status, limit, offset } = c.req.query();

    const options: any = {};

    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      options.status = status as OrderStatus;
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (!isNaN(limitNum) && limitNum > 0) {
        options.limit = limitNum;
      }
    }

    if (offset) {
      const offsetNum = parseInt(offset);
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        options.offset = offsetNum;
      }
    }

    const orders = await orderService.getAllOrders(options);
    return c.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// POST /orders/:id/pay - 注文支払い
app.post('/:orderId/pay', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const order = await orderService.payOrder(orderId);
    return c.json(order);
  } catch (error) {
    console.error('Error paying order:', error);

    if (error instanceof Error && error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json({ error: 'Failed to pay order' }, 500);
  }
});

// PUT /orders/:id/status - 注文ステータス更新
app.put('/:orderId/status', async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { status } = body;

    // バリデーション
    if (
      !status ||
      !Object.values(OrderStatus).includes(status as OrderStatus)
    ) {
      return c.json(
        {
          error: `Status must be one of: ${Object.values(OrderStatus).join(', ')}`,
        },
        400
      );
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status as OrderStatus
    );
    return c.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);

    if (error instanceof Error && error.message === 'Order not found') {
      return c.json({ error: 'Order not found' }, 404);
    }

    return c.json({ error: 'Failed to update order status' }, 500);
  }
});

// OrderItemGroup endpoints
const orderItemGroupsApp = new Hono();

// POST /order-item-groups/:id/prepare - グループを準備中にする
orderItemGroupsApp.post('/:groupId/prepare', async (c) => {
  try {
    const groupId = c.req.param('groupId');
    await orderService.prepareGroup(groupId);
    return c.json({ message: 'Group marked as preparing' });
  } catch (error) {
    console.error('Error preparing group:', error);

    if (
      error instanceof Error &&
      error.message === 'Order item group not found'
    ) {
      return c.json({ error: 'Order item group not found' }, 404);
    }

    return c.json({ error: 'Failed to prepare group' }, 500);
  }
});

// POST /order-item-groups/:id/ready - グループを準備完了にする
orderItemGroupsApp.post('/:groupId/ready', async (c) => {
  try {
    const groupId = c.req.param('groupId');
    await orderService.markGroupReady(groupId);
    return c.json({ message: 'Group marked as ready' });
  } catch (error) {
    console.error('Error marking group as ready:', error);

    if (
      error instanceof Error &&
      error.message === 'Order item group not found'
    ) {
      return c.json({ error: 'Order item group not found' }, 404);
    }

    return c.json({ error: 'Failed to mark group as ready' }, 500);
  }
});

export { app as ordersAPI, orderItemGroupsApp as orderItemGroupsAPI };
