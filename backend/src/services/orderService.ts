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

export class OrderService {
  private merchandiseService: MerchandiseService;

  constructor() {
    this.merchandiseService = new MerchandiseService();
  }

  async createOrder(input: CreateOrderRequestInput): Promise<OrderWithGroups> {
    // バリデーション
    if (!input.groups || input.groups.length === 0) {
      throw new Error('Order must contain at least one group');
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
        throw new Error(
          `Group validation failed: ${groupValidation.errors.join(', ')}`
        );
      }

      // 商品存在・利用可能性検証
      const merchandiseValidation =
        await this.merchandiseService.validateMerchandiseForOrder(
          merchandiseIds
        );
      if (!merchandiseValidation.valid) {
        throw new Error(
          `Merchandise validation failed: ${merchandiseValidation.errors.join(', ')}`
        );
      }
    }

    // 呼び出し番号を生成
    const callNum = await this.generateCallNumber();

    // トランザクション内で注文作成
    return await prisma.$transaction(async (tx) => {
      // 注文作成
      const order = await tx.order.create({
        data: {
          callNum,
          status: 'ORDERED',
        },
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
      return (await tx.order.findUnique({
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
    });
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
      throw new Error('Order not found');
    }

    return await prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async payOrder(id: string): Promise<OrderWithGroups> {
    const order = await this.getOrderById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    await this.updateOrderStatus(id, 'PAID');

    return (await this.getOrderById(id))!;
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
