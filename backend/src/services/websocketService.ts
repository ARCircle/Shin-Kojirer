import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer, IncomingMessage } from 'http';
import { OrderWithGroups, Order, OrderGroupStatus } from '../models/types';

export class WebSocketService {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3002',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // クライアントが特定の注文の更新を購読
      socket.on('subscribe-order', (orderId: string) => {
        socket.join(`order-${orderId}`);
        console.log(`Client ${socket.id} subscribed to order ${orderId}`);
      });

      // クライアントが注文購読を解除
      socket.on('unsubscribe-order', (orderId: string) => {
        socket.leave(`order-${orderId}`);
        console.log(`Client ${socket.id} unsubscribed from order ${orderId}`);
      });

      // キッチンディスプレイが全注文の更新を購読
      socket.on('subscribe-kitchen', () => {
        socket.join('kitchen');
        console.log(`Client ${socket.id} subscribed to kitchen updates`);
      });

      // キッチン購読を解除
      socket.on('unsubscribe-kitchen', () => {
        socket.leave('kitchen');
        console.log(`Client ${socket.id} unsubscribed from kitchen updates`);
      });

      // 支払い画面が全注文の更新を購読
      socket.on('subscribe-payment', () => {
        socket.join('payment');
        console.log(`Client ${socket.id} subscribed to payment updates`);
      });

      // 支払い購読を解除
      socket.on('unsubscribe-payment', () => {
        socket.leave('payment');
        console.log(`Client ${socket.id} unsubscribed from payment updates`);
      });

      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });
    });
  }

  // 新しい注文が作成されたときに通知
  emitNewOrder(order: OrderWithGroups) {
    const orderData = {
      orderId: order.id,
      callNum: order.callNum,
      status: order.status,
      groups: order.groups.map((group) => ({
        id: group.id,
        status: group.status,
        items: group.items.map((item) => ({
          id: item.id,
          merchandise: {
            id: item.merchandise.id,
            name: item.merchandise.name,
            type: item.merchandise.type,
            price: item.merchandise.price,
          },
        })),
      })),
      createdAt: order.createdAt,
    };

    // キッチンに通知
    this.io.to('kitchen').emit('order-created', orderData);

    // 支払い画面に通知（ORDERED状態の場合のみ）
    if (order.status === 'ORDERED') {
      this.io.to('payment').emit('order-created', orderData);
    }

    console.log(`Emitted new order notification for order ${order.id}`);
  }

  // 注文のステータスが更新されたときに通知
  emitOrderStatusUpdate(orderId: string, newStatus: string) {
    const updateData = {
      orderId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    };

    // 特定の注文を購読しているクライアントに通知
    this.io.to(`order-${orderId}`).emit('order-status-updated', updateData);

    // キッチンにも通知
    this.io.to('kitchen').emit('order-status-updated', updateData);

    // 支払い画面にも通知（ORDERED以外に変更された場合、一覧から削除するため）
    this.io.to('payment').emit('order-status-updated', updateData);

    console.log(
      `Emitted order status update for order ${orderId}: ${newStatus}`
    );
  }

  // グループの調理ステータスが更新されたときに通知
  emitGroupStatusUpdate(
    orderId: string,
    groupId: string,
    newStatus: OrderGroupStatus
  ) {
    const updateData = {
      orderId,
      groupId,
      status: newStatus,
      timestamp: new Date().toISOString(),
    };

    // 特定の注文を購読しているクライアントに通知
    this.io.to(`order-${orderId}`).emit('group-status-updated', updateData);

    // キッチンにも通知
    this.io.to('kitchen').emit('group-status-updated', updateData);

    console.log(
      `Emitted group status update for order ${orderId}, group ${groupId}: ${newStatus}`
    );
  }

  // 注文が支払い済みになったときに通知
  emitOrderPaid(orderId: string, order: OrderWithGroups) {
    this.io.to('kitchen').emit('order-paid', {
      orderId,
      callNum: order.callNum,
      groups: order.groups.map((group) => ({
        id: group.id,
        status: group.status,
        items: group.items.map((item) => ({
          id: item.id,
          merchandise: {
            id: item.merchandise.id,
            name: item.merchandise.name,
            type: item.merchandise.type,
          },
        })),
      })),
      timestamp: new Date().toISOString(),
    });

    console.log(`Emitted order paid notification for order ${orderId}`);
  }

  // 全注文が完了したときに通知
  emitOrderReady(orderId: string) {
    // 特定の注文を購読しているクライアントに通知
    this.io.to(`order-${orderId}`).emit('order-ready', {
      orderId,
      message: 'お料理ができました！カウンターまでお越しください。',
      timestamp: new Date().toISOString(),
    });

    // キッチンにも通知
    this.io.to('kitchen').emit('order-ready', {
      orderId,
      timestamp: new Date().toISOString(),
    });

    console.log(`Emitted order ready notification for order ${orderId}`);
  }

  // 一般的なリアルタイム通知メソッド
  emitToRoom(room: string, event: string, data: any) {
    this.io.to(room).emit(event, data);
    console.log(`Emitted ${event} to room ${room}:`, data);
  }

  // 全クライアントへの通知
  emitToAll(event: string, data: any) {
    this.io.emit(event, data);
    console.log(`Emitted ${event} to all clients:`, data);
  }

  // 接続中のクライアント数を取得
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  // 特定のルームのクライアント数を取得
  async getRoomClientsCount(room: string): Promise<number> {
    const sockets = await this.io.in(room).allSockets();
    return sockets.size;
  }
}

export let websocketService: WebSocketService;

export function initializeWebSocketService(
  httpServer: HTTPServer,
  options?: {
    pathAliases?: string[];
  }
) {
  const pathAliases = options?.pathAliases ?? [];

  const rewriteUrl = (req: IncomingMessage) => {
    if (!req.url) return;

    for (const rawAlias of pathAliases) {
      if (!rawAlias) continue;

      const alias =
        rawAlias !== '/' && rawAlias.endsWith('/')
          ? rawAlias.slice(0, -1)
          : rawAlias;

      if (alias === '/socket.io') {
        continue;
      }

      const [pathname, search = ''] = req.url.split('?');
      const aliasMatch =
        pathname === alias || pathname.startsWith(`${alias}/`);

      if (!aliasMatch) {
        continue;
      }

      const extraPath = pathname.slice(alias.length);
      const normalizedExtraPath =
        extraPath.length === 0
          ? ''
          : extraPath.startsWith('/')
            ? extraPath
            : `/${extraPath}`;

      const newPathname = `/socket.io${normalizedExtraPath}`;
      req.url = search ? `${newPathname}?${search}` : newPathname;
      break;
    }
  };

  if (pathAliases.length > 0) {
    httpServer.prependListener('request', (req) => {
      rewriteUrl(req);
    });
    httpServer.prependListener('upgrade', (req) => {
      rewriteUrl(req);
    });
  }

  websocketService = new WebSocketService(httpServer);
  return websocketService;
}
