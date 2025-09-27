import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MerchandiseService } from '../../src/services/merchandiseService';
import { prisma } from '../../src/lib/db';
import { MerchandiseType } from '../../src/models/types';

// モックの設定
vi.mock('../../src/lib/db', () => ({
  prisma: {
    merchandise: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('MerchandiseService', () => {
  let merchandiseService: MerchandiseService;

  beforeEach(() => {
    merchandiseService = new MerchandiseService();
    vi.clearAllMocks();
  });

  describe('validateGroupItems', () => {
    it('BASE_ITEMが1つだけの場合は有効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateGroupItems(['1']);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('BASE_ITEMが複数ある場合は無効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: true,
        },
        {
          id: '2',
          name: 'チャーハン',
          type: 'BASE_ITEM',
          price: 700,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateGroupItems(['1', '2']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'A group can contain at most one BASE_ITEM'
      );
    });

    it('BASE_ITEMとTOPPINGの組み合わせは有効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: true,
        },
        {
          id: '2',
          name: 'チャーシュー',
          type: 'TOPPING',
          price: 150,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateGroupItems(['1', '2']);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('BASE_ITEMなしでTOPPINGだけは無効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'チャーシュー',
          type: 'TOPPING',
          price: 150,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateGroupItems(['1']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'TOPPING or DISCOUNT items can only be added to a group that contains a BASE_ITEM'
      );
    });

    it('BASE_ITEMなしでDISCOUNTだけは無効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'SNS割引',
          type: 'DISCOUNT',
          price: -50,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateGroupItems(['1']);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'TOPPING or DISCOUNT items can only be added to a group that contains a BASE_ITEM'
      );
    });

    it('BASE_ITEM、TOPPING、DISCOUNTの完全な組み合わせは有効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: true,
        },
        {
          id: '2',
          name: 'チャーシュー',
          type: 'TOPPING',
          price: 150,
          isAvailable: true,
        },
        {
          id: '3',
          name: 'SNS割引',
          type: 'DISCOUNT',
          price: -50,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateGroupItems([
        '1',
        '2',
        '3',
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateMerchandiseForOrder', () => {
    it('存在し利用可能な商品は有効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: true,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateMerchandiseForOrder([
        '1',
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('存在しない商品IDは無効', async () => {
      vi.mocked(prisma.merchandise.findMany).mockResolvedValue([]);

      const result = await merchandiseService.validateMerchandiseForOrder([
        'nonexistent',
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Merchandise not found: nonexistent');
    });

    it('利用不可の商品は無効', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: false,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateMerchandiseForOrder([
        '1',
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unavailable merchandise: ラーメン');
    });

    it('一部存在しない、一部利用不可の場合は複数エラー', async () => {
      const mockMerchandise = [
        {
          id: '1',
          name: 'ラーメン',
          type: 'BASE_ITEM',
          price: 800,
          isAvailable: false,
        },
      ];

      vi.mocked(prisma.merchandise.findMany).mockResolvedValue(mockMerchandise);

      const result = await merchandiseService.validateMerchandiseForOrder([
        '1',
        'nonexistent',
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Merchandise not found: nonexistent');
      expect(result.errors).toContain('Unavailable merchandise: ラーメン');
    });
  });

  describe('setMerchandisePrice', () => {
    it('存在する商品の価格を正常に更新', async () => {
      const mockMerchandise = {
        id: '1',
        name: 'ラーメン',
        type: 'BASE_ITEM' as MerchandiseType,
        price: 800,
        isAvailable: true,
      };

      const updatedMerchandise = { ...mockMerchandise, price: 900 };

      vi.mocked(prisma.merchandise.findUnique).mockResolvedValue(
        mockMerchandise
      );
      vi.mocked(prisma.merchandise.update).mockResolvedValue(
        updatedMerchandise
      );

      const result = await merchandiseService.setMerchandisePrice('1', {
        price: 900,
        since: new Date().toISOString(),
      });

      expect(result.price).toBe(900);
      expect(prisma.merchandise.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          price: 900,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('存在しない商品の価格更新はエラー', async () => {
      vi.mocked(prisma.merchandise.findUnique).mockResolvedValue(null);

      await expect(
        merchandiseService.setMerchandisePrice('nonexistent', {
          price: 900,
          since: new Date().toISOString(),
        })
      ).rejects.toThrow('Merchandise not found');
    });
  });

  describe('toggleAvailability', () => {
    it('利用可能な商品を利用不可に変更', async () => {
      const mockMerchandise = {
        id: '1',
        name: 'ラーメン',
        type: 'BASE_ITEM' as MerchandiseType,
        price: 800,
        isAvailable: true,
      };

      const updatedMerchandise = { ...mockMerchandise, isAvailable: false };

      vi.mocked(prisma.merchandise.findUnique).mockResolvedValue(
        mockMerchandise
      );
      vi.mocked(prisma.merchandise.update).mockResolvedValue(
        updatedMerchandise
      );

      const result = await merchandiseService.toggleAvailability('1');

      expect(result.isAvailable).toBe(false);
      expect(prisma.merchandise.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isAvailable: false },
      });
    });

    it('利用不可な商品を利用可能に変更', async () => {
      const mockMerchandise = {
        id: '1',
        name: 'ラーメン',
        type: 'BASE_ITEM' as MerchandiseType,
        price: 800,
        isAvailable: false,
      };

      const updatedMerchandise = { ...mockMerchandise, isAvailable: true };

      vi.mocked(prisma.merchandise.findUnique).mockResolvedValue(
        mockMerchandise
      );
      vi.mocked(prisma.merchandise.update).mockResolvedValue(
        updatedMerchandise
      );

      const result = await merchandiseService.toggleAvailability('1');

      expect(result.isAvailable).toBe(true);
    });

    it('存在しない商品の可用性変更はエラー', async () => {
      vi.mocked(prisma.merchandise.findUnique).mockResolvedValue(null);

      await expect(
        merchandiseService.toggleAvailability('nonexistent')
      ).rejects.toThrow('Merchandise not found');
    });
  });
});
