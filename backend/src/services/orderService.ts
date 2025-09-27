import { prisma } from '../lib/db';
import {
  Order,
  OrderWithGroups,
  OrderItemGroup,
  OrderStatus,
  OrderGroupStatus,
  CreateOrderRequestInput,
} from '../models/types';
import { MerchandiseService } from './merchandiseService';
import { websocketService } from './websocketService';
import { logBusinessEvent, logError } from '../utils/logger';

export class OrderService {
  private merchandiseService: MerchandiseService;

  constructor() {
    this.merchandiseService = new MerchandiseService();
  }

  async createOrder(input: CreateOrderRequestInput): Promise<OrderWithGroups> {
    logBusinessEvent('order.create.started', {
      groupCount: input.groups?.length || 0,
      totalItems:
        input.groups?.reduce((sum, g) => sum + (g.items?.length || 0), 0) || 0,
    });

    // バリデーション
    if (!input.groups || input.groups.length === 0) {
      const error = new Error('Order must contain at least one group');
      logError(error, { input });
      throw error;
    }

    for (const group of input.groups) {
      if (!group.items || group.items.length === 0) {
        throw new Error('Each group must contain at least one item');
      }

      // グループ内のアイテムのビジネスルール検証
      const merchandiseIds = group.items.map((item) => item.merchandiseId);
      const groupValidation =
        await this.merchandiseService.validateGroupItems(merchandiseIds);
      if (!groupValidation.valid) {
        const error = new Error(
          `Group validation failed: ${groupValidation.errors.join(', ')}`
        );
        logError(error, { merchandiseIds, groupValidation });
        throw error;
      }

      // 商品存在・利用可能性検証
      const merchandiseValidation =
        await this.merchandiseService.validateMerchandiseForOrder(
          merchandiseIds
        );
      if (!merchandiseValidation.valid) {
        const error = new Error(
          `Merchandise validation failed: ${merchandiseValidation.errors.join(', ')}`
        );
        logError(error, { merchandiseIds, merchandiseValidation });
        throw error;
      }
    }

    // 呼び出し番号を生成
    const callNum = await this.generateCallNumber();

    // トランザクション内で注文作成
    const order = await prisma.$transaction(async (tx) => {
      // 注文作成
      const order = await tx.order.create({
        data: {
          callNum,
          status: 'ORDERED',
        },
      });

      logBusinessEvent('order.created', {
        orderId: order.id,
        callNum: order.callNum,
        status: order.status,
      });

      // グループとアイテム作成
      for (const groupInput of input.groups) {
        const group = await tx.orderItemGroup.create({
          data: {
            orderId: order.id,
            status: 'NOT_READY',
          },
        });

        for (const itemInput of groupInput.items) {
          await tx.orderItem.create({
            data: {
              orderItemGroupId: group.id,
              merchandiseId: itemInput.merchandiseId,
            },
          });
        }
      }

      // 作成された注文を関連データと共に取得
      const createdOrder = (await tx.order.findUnique({
        where: { id: order.id },
        include: {
          groups: {
            include: {
              items: {
                include: {
                  merchandise: true,
                },
              },
            },
          },
        },
      })) as OrderWithGroups;

      logBusinessEvent('order.create.completed', {
        orderId: order.id,
        callNum: order.callNum,
        groupCount: createdOrder.groups.length,
        totalAmount: createdOrder.groups.reduce(
          (sum, group) =>
            sum +
            group.items.reduce(
              (itemSum, item) => itemSum + item.merchandise.price,
              0
            ),
          0
        ),
      });

      return createdOrder;
    });

    // WebSocketで新しい注文をキッチンに通知
    if (websocketService) {
      websocketService.emitNewOrder(order);
    }

    return order;
  }

  async getOrderById(id: string): Promise<OrderWithGroups | null> {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        groups: {
          include: {
            items: {
              include: {
                merchandise: true,
              },
            },
          },
        },
      },
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      const error = new Error('Order not found');
      logError(error, { orderId: id });
      throw error;
    }

    logBusinessEvent('order.status.updating', {
      orderId: id,
      oldStatus: order.status,
      newStatus: status,
    });

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    logBusinessEvent('order.status.updated', {
      orderId: id,
      status: updatedOrder.status,
    });

    // WebSocketで注文ステータス更新を通知
    if (websocketService) {
      websocketService.emitOrderStatusUpdate(id, status);

      // 注文が完了した場合は特別な通知
      if (status === 'READY') {
        websocketService.emitOrderReady(id);
      }
    }

    return updatedOrder;
  }

  async payOrder(id: string): Promise<OrderWithGroups> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    await this.updateOrderStatus(id, 'PAID');

    const paidOrder = (await this.getOrderById(id))!;

    // WebSocketで支払い完了をキッチンに通知
    if (websocketService) {
      websocketService.emitOrderPaid(id, paidOrder);
    }

    return paidOrder;
  }

  async updateGroupStatus(
    groupId: string,
    status: OrderGroupStatus
  ): Promise<void> {
    const group = await prisma.orderItemGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new Error('Order item group not found');
    }

    await prisma.orderItemGroup.update({
      where: { id: groupId },
      data: { status },
    });

    // WebSocketでグループステータス更新を通知
    if (websocketService) {
      websocketService.emitGroupStatusUpdate(group.orderId, groupId, status);
    }

    // 全てのグループが準備完了した場合、注文ステータスを更新
    if (status === 'READY') {
      await this.checkAndUpdateOrderStatus(group.orderId);
    }
  }

  async prepareGroup(groupId: string): Promise<void> {
    await this.updateGroupStatus(groupId, 'PREPARING');
  }

  async markGroupReady(groupId: string): Promise<void> {
    await this.updateGroupStatus(groupId, 'READY');
  }

  private async generateCallNumber(): Promise<number> {
    // 今日の最大呼び出し番号を取得
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const latestOrder = await prisma.order.findFirst({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: {
        callNum: 'desc',
      },
    });

    // 呼び出し番号は1から開始し、日ごとにリセット
    return latestOrder ? latestOrder.callNum + 1 : 1;
  }

  private async checkAndUpdateOrderStatus(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        groups: true,
      },
    });

    if (!order) {
      return;
    }

    // 全てのグループが準備完了した場合
    const allGroupsReady = order.groups.every(
      (group) => group.status === 'READY'
    );

    if (allGroupsReady && order.status === 'PAID') {
      await this.updateOrderStatus(orderId, 'READY');
    }
  }

  async getAllOrders(options?: {
    status?: OrderStatus;
    limit?: number;
    offset?: number;
  }): Promise<OrderWithGroups[]> {
    const where = options?.status ? { status: options.status } : {};

    return await prisma.order.findMany({
      where,
      include: {
        groups: {
          include: {
            items: {
              include: {
                merchandise: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  async getOrdersByStatus(status: OrderStatus): Promise<OrderWithGroups[]> {
    return await this.getAllOrders({ status });
  }

  async getTodaysOrders(): Promise<OrderWithGroups[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        groups: {
          include: {
            items: {
              include: {
                merchandise: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
