import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer } from 'http';
import { cors } from 'hono/cors';
import { connectToDatabase, healthCheck } from './lib/db';
import { merchandiseAPI } from './api/merchandise';
import { ordersAPI, orderItemGroupsAPI } from './api/orders';
import { initializeWebSocketService } from './services/websocketService';
import { logger, createRequestLogger } from './utils/logger';

const app = new Hono();

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'];

app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// リクエストログ
// app.use('*', createRequestLogger());

// ヘルスチェックエンドポイント
app.get('/health', async (c) => {
  const dbHealthy = await healthCheck();

  if (dbHealthy) {
    return c.json({ status: 'healthy', database: 'connected' });
  } else {
    return c.json({ status: 'unhealthy', database: 'disconnected' }, 503);
  }
});

function normalizePrefix(prefix: string | undefined): string {
  if (!prefix) {
    return '';
  }
  const trimmed = prefix.trim();
  if (!trimmed || trimmed === '/') {
    return '';
  }
  let normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function registerRoutes(basePath: string) {
  const withBase = (path: string) => (basePath ? `${basePath}${path}` : path);
  app.route(withBase('/merchandise'), merchandiseAPI);
  app.route(withBase('/orders'), ordersAPI);
  app.route(withBase('/order-item-groups'), orderItemGroupsAPI);
}

const defaultApiPrefix = normalizePrefix('/api');
const configuredPrefix = normalizePrefix(
  process.env.API_ROUTE_PREFIX ?? process.env.API_BASE_PATH
);

// Always expose non-prefixed routes for backward compatibility
registerRoutes('');

// Expose configured prefix when provided, otherwise fall back to /api
if (configuredPrefix) {
  registerRoutes(configuredPrefix);
} else if (defaultApiPrefix) {
  registerRoutes(defaultApiPrefix);
}

// 404ハンドラー
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// エラーハンドラー
app.onError((err, c) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString(),
  });
  return c.json({ error: 'Internal Server Error' }, 500);
});

// サーバー起動（テスト環境では実行しない）
if (process.env.NODE_ENV !== 'test') {
  const port = parseInt(process.env.PORT || '4000');

  async function startServer() {
    try {
      await connectToDatabase();
      logger.info('Database connected successfully');

      // HTTPサーバーを作成
      const server = createServer();

      // WebSocketサービスを初期化
      const websocketService = initializeWebSocketService(server);
      logger.info('WebSocket service initialized');

      // HonoアプリをHTTPサーバーにアタッチ
      server.on('request', async (req, res) => {
        const requestInit: RequestInit = {
          method: req.method,
          headers: req.headers as any,
        };

        // ボディがある場合のみ設定
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          requestInit.body = req as any;
          (requestInit as any).duplex = 'half';
        }

        const response = await app.fetch(
          new Request(`http://localhost:${port}${req.url}`, requestInit)
        );

        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        if (response.body) {
          const reader = response.body.getReader();
          const pump = async () => {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            pump();
          };
          pump();
        } else {
          res.end();
        }
      });

      server.listen(port, () => {
        logger.info('Server started', {
          port,
          healthCheck: `http://localhost:${port}/health`,
          websocketReady: true,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      logger.error('Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      process.exit(1);
    }
  }

  startServer();
}

export { app };
