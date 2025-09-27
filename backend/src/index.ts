import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { connectToDatabase, healthCheck } from './lib/db';
import { merchandiseAPI } from './api/merchandise';
import { ordersAPI, orderItemGroupsAPI } from './api/orders';

const app = new Hono();

// CORS設定
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// ヘルスチェックエンドポイント
app.get('/health', async (c) => {
  const dbHealthy = await healthCheck();

  if (dbHealthy) {
    return c.json({ status: 'healthy', database: 'connected' });
  } else {
    return c.json({ status: 'unhealthy', database: 'disconnected' }, 503);
  }
});

// API routes
app.route('/merchandise', merchandiseAPI);
app.route('/orders', ordersAPI);
app.route('/order-item-groups', orderItemGroupsAPI);

// 404ハンドラー
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// サーバー起動（テスト環境では実行しない）
if (process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.PORT || '3000');

  async function startServer() {
    try {
      await connectToDatabase();
      console.log('Database connected successfully');

      serve({
        fetch: app.fetch,
        port,
      });

      console.log(`Server is running on port ${port}`);
      console.log(`Health check: http://localhost:${port}/health`);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  startServer();
}

export { app };
