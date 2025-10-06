import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderService } from '../../src/services/orderService';
import { MerchandiseService } from '../../src/services/merchandiseService';
import { prisma } from '../../src/lib/db';
import {
  OrderStatus,
  OrderGroupStatus,
  CreateOrderRequestInput,
} from '../../src/models/types';

// モックの設定
vi.mock('../../src/lib/db', () => ({
  prisma: {
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    orderItemGroup: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../src/services/merchandiseService');

describe('OrderService', () => {
  let orderService: OrderService;
  let mockMerchandiseService: any;

  beforeEach(() => {
    orderService = new OrderService();
    mockMerchandiseService = vi.mocked(MerchandiseService).prototype;
    vi.clearAllMocks();
  });

  describe('generateCallNumber', () => {
    it('今日初回の注文の場合は呼び出し番号1を返す', async () => {
      // プライベートメソッドをテストするため、リフレクションを使用
      const generateCallNumber = (orderService as any).generateCallNumber.bind(
        orderService
      );

      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);

      const callNum = await generateCallNumber();

      expect(callNum).toBe(1);
    });

    it('今日既存の注文がある場合は最大番号+1を返す', async () => {
      const generateCallNumber = (orderService as any).generateCallNumber.bind(
        orderService
      );

      const mockOrder = {
        id: 'existing-order',
        callNum: 5,
        status: 'ORDERED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder);

      const callNum = await generateCallNumber();

      expect(callNum).toBe(6);
    });

    it('正しい日付範囲でクエリを実行する', async () => {
      const generateCallNumber = (orderService as any).generateCallNumber.bind(
        orderService
      );

      vi.mocked(prisma.order.findFirst).mockResolvedValue(null);

      await generateCallNumber();

      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
        orderBy: {
          callNum: 'desc',
        },
      });
    });
  });

  describe('createOrder', () => {
    const validOrderInput: CreateOrderRequestInput = {
      groups: [
        {
          items: [{ merchandiseId: 'base-item-1' }],
        },
      ],
    };

    beforeEach(() => {
      // MerchandiseServiceのモック設定
      mockMerchandiseService.validateGroupItems.mockResolvedValue({
        valid: true,
        errors: [],
      });
      mockMerchandiseService.validateMerchandiseForOrder.mockResolvedValue({
        valid: true,
        errors: [],
      });

      // Prismaトランザクションのモック
      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          const mockTx = {
            order: {
              create: vi.fn().mockResolvedValue({
                id: 'new-order-id',
                callNum: 1,
                status: 'ORDERED',
                createdAt: new Date(),
                updatedAt: new Date(),
              }),
              findUnique: vi.fn().mockResolvedValue({
                id: 'new-order-id',
                callNum: 1,
                status: 'ORDERED',
                groups: [
                  {
                    id: 'group-1',
                    status: 'NOT_READY',
                    items: [
                      {
                        id: 'item-1',
                        merchandiseId: 'base-item-1',
                        merchandise: {
                          id: 'base-item-1',
                          name: 'ラーメン',
                          price: 800,
                          type: 'BASE_ITEM',
                        },
                      },
                    ],
                  },
                ],
              }),
            },
            orderItemGroup: {
              create: vi.fn().mockResolvedValue({
                id: 'group-1',
                orderId: 'new-order-id',
                status: 'NOT_READY',
              }),
            },
            orderItem: {
              create: vi.fn().mockResolvedValue({
                id: 'item-1',
                orderItemGroupId: 'group-1',
                merchandiseId: 'base-item-1',
              }),
            },
          };
          return callback(mockTx);
        }
      );
    });

    it('有効な注文を正常に作成する', async () => {
      const result = await orderService.createOrder(validOrderInput);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-order-id');
      expect(result.callNum).toBe(1);
      expect(result.status).toBe('ORDERED');
      expect(result.groups).toHaveLength(1);
    });

    it('グループが空の場合はエラーを投げる', async () => {
      const invalidInput: CreateOrderRequestInput = {
        groups: [],
      };

      await expect(orderService.createOrder(invalidInput)).rejects.toThrow(
        'Order must contain at least one group'
      );
    });

    it('グループにアイテムがない場合はエラーを投げる', async () => {
      const invalidInput: CreateOrderRequestInput = {
        groups: [{ items: [] }],
      };

      await expect(orderService.createOrder(invalidInput)).rejects.toThrow(
        'Each group must contain at least one item'
      );
    });

    it('グループバリデーションが失敗した場合はエラーを投げる', async () => {
      mockMerchandiseService.validateGroupItems.mockResolvedValue({
        valid: false,
        errors: ['A group can contain at most one BASE_ITEM'],
      });

      await expect(orderService.createOrder(validOrderInput)).rejects.toThrow(
        'Group validation failed: A group can contain at most one BASE_ITEM'
      );
    });

    it('商品バリデーションが失敗した場合はエラーを投げる', async () => {
      mockMerchandiseService.validateMerchandiseForOrder.mockResolvedValue({
        valid: false,
        errors: ['Merchandise not found: invalid-id'],
      });

      await expect(orderService.createOrder(validOrderInput)).rejects.toThrow(
        'Merchandise validation failed: Merchandise not found: invalid-id'
      );
    });
  });

  describe('checkAndUpdateOrderStatus', () => {
    it('全グループがREADYで注文がPAIDの場合、注文をREADYに更新', async () => {
      const checkAndUpdateOrderStatus = (
        orderService as any
      ).checkAndUpdateOrderStatus.bind(orderService);

      const mockOrder = {
        id: 'order-1',
        status: 'PAID',
        groups: [
          { id: 'group-1', status: 'READY' },
          { id: 'group-2', status: 'READY' },
        ],
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.order.update).mockResolvedValue({} as any);

      await checkAndUpdateOrderStatus('order-1');

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'READY' },
      });
    });

    it('一部グループがREADYでない場合は注文ステータスを更新しない', async () => {
      const checkAndUpdateOrderStatus = (
        orderService as any
      ).checkAndUpdateOrderStatus.bind(orderService);

      const mockOrder = {
        id: 'order-1',
        status: 'PAID',
        groups: [
          { id: 'group-1', status: 'READY' },
          { id: 'group-2', status: 'PREPARING' },
        ],
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

      await checkAndUpdateOrderStatus('order-1');

      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('注文ステータスがPAIDでない場合は更新しない', async () => {
      const checkAndUpdateOrderStatus = (
        orderService as any
      ).checkAndUpdateOrderStatus.bind(orderService);

      const mockOrder = {
        id: 'order-1',
        status: 'ORDERED',
        groups: [
          { id: 'group-1', status: 'READY' },
          { id: 'group-2', status: 'READY' },
        ],
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

      await checkAndUpdateOrderStatus('order-1');

      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('注文が見つからない場合は何もしない', async () => {
      const checkAndUpdateOrderStatus = (
        orderService as any
      ).checkAndUpdateOrderStatus.bind(orderService);

      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await checkAndUpdateOrderStatus('nonexistent');

      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('updateGroupStatus', () => {
    beforeEach(() => {
      vi.mocked(prisma.orderItemGroup.findUnique).mockResolvedValue({
        id: 'group-1',
        orderId: 'order-1',
        status: 'NOT_READY',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.orderItemGroup.update).mockResolvedValue({} as any);
    });

    it('グループステータスを正常に更新する', async () => {
      await orderService.updateGroupStatus('group-1', 'PREPARING');

      expect(prisma.orderItemGroup.update).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        data: { status: 'PREPARING' },
      });
    });

    it('ステータスがREADYの場合は注文ステータスもチェックする', async () => {
      // checkAndUpdateOrderStatusをスパイ
      const spy = vi
        .spyOn(orderService as any, 'checkAndUpdateOrderStatus')
        .mockResolvedValue(undefined);

      await orderService.updateGroupStatus('group-1', 'READY');

      expect(spy).toHaveBeenCalledWith('order-1');
    });

    it('存在しないグループの更新はエラーを投げる', async () => {
      vi.mocked(prisma.orderItemGroup.findUnique).mockResolvedValue(null);

      await expect(
        orderService.updateGroupStatus('nonexistent', 'PREPARING')
      ).rejects.toThrow('Order item group not found');
    });
  });

  describe('payOrder', () => {
    it('存在する注文の支払いを正常に処理する', async () => {
      const mockOrder = {
        id: 'order-1',
        callNum: 1,
        status: 'ORDERED',
        groups: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPaidOrder = { ...mockOrder, status: 'PAID' };

      // payOrderでは以下の順で呼ばれる：
      // 1. getOrderById（存在確認）
      // 2. updateOrderStatus内でもorderを取得する
      // 3. 最後にgetOrderById（更新後の取得）
      vi.mocked(prisma.order.findUnique)
        .mockResolvedValueOnce(mockOrder as any) // 1回目: 存在確認
        .mockResolvedValueOnce(mockOrder as any) // 2回目: updateOrderStatus内
        .mockResolvedValueOnce(mockPaidOrder as any); // 3回目: 更新後の取得
      vi.mocked(prisma.order.update).mockResolvedValue(mockPaidOrder as any);

      const result = await orderService.payOrder('order-1');

      expect(result).toBeDefined();
      expect(result.status).toBe('PAID');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID' },
      });
    });

    it('存在しない注文の支払いはエラーを投げる', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await expect(orderService.payOrder('nonexistent')).rejects.toThrow(
        'Order not found'
      );
    });
  });

  describe('getTodaysOrders', () => {
    it('今日の日付範囲で注文を取得する', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          callNum: 1,
          status: 'PAID',
          groups: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);

      const result = await orderService.getTodaysOrders();

      expect(result).toEqual(mockOrders);
      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
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

      // 日付範囲が正しく設定されているかチェック
      const call = vi.mocked(prisma.order.findMany).mock.calls[0][0];
      const whereClause = call.where.createdAt;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(whereClause.gte.getTime()).toBe(today.getTime());
      expect(whereClause.lt.getTime()).toBe(tomorrow.getTime());
    });
  });
});
