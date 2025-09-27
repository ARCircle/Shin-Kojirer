import { prisma } from '../lib/db';
import {
  Merchandise,
  UpdateMerchandiseInput,
  MerchandiseType,
  SetPriceInput,
} from '../models/types';

export class MerchandiseService {
  async createMerchandise(input: {
    name: string;
    price: number;
    type: MerchandiseType;
    isAvailable?: boolean;
  }): Promise<Merchandise> {
    return await prisma.merchandise.create({
      data: {
        name: input.name,
        price: input.price,
        type: input.type,
        isAvailable: input.isAvailable ?? true,
      },
    });
  }

  async getAllMerchandise(options?: {
    available?: boolean;
  }): Promise<Merchandise[]> {
    const where = options?.available !== undefined 
      ? { isAvailable: options.available }
      : {};

    return await prisma.merchandise.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getMerchandiseById(id: string): Promise<Merchandise | null> {
    return await prisma.merchandise.findUnique({
      where: { id },
    });
  }

  async updateMerchandise(
    id: string,
    input: Partial<UpdateMerchandiseInput>
  ): Promise<Merchandise> {
    return await prisma.merchandise.update({
      where: { id },
      data: input,
    });
  }

  async setMerchandisePrice(
    id: string,
    priceInput: SetPriceInput
  ): Promise<Merchandise> {
    // まず商品が存在するか確認
    const merchandise = await this.getMerchandiseById(id);
    if (!merchandise) {
      throw new Error('Merchandise not found');
    }

    // 価格を更新
    return await this.updateMerchandise(id, {
      price: priceInput.price,
      updatedAt: new Date(priceInput.since),
    });
  }

  async deleteMerchandise(id: string): Promise<void> {
    await prisma.merchandise.delete({
      where: { id },
    });
  }

  async toggleAvailability(id: string): Promise<Merchandise> {
    const merchandise = await this.getMerchandiseById(id);
    if (!merchandise) {
      throw new Error('Merchandise not found');
    }

    return await this.updateMerchandise(id, {
      isAvailable: !merchandise.isAvailable,
    });
  }

  async getMerchandiseByType(type: MerchandiseType): Promise<Merchandise[]> {
    return await prisma.merchandise.findMany({
      where: { type },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getAvailableMerchandiseByType(type: MerchandiseType): Promise<Merchandise[]> {
    return await prisma.merchandise.findMany({
      where: {
        type,
        isAvailable: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // ビジネスルール検証
  async validateMerchandiseForOrder(merchandiseIds: string[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // 商品が存在し、利用可能かチェック
    const merchandise = await prisma.merchandise.findMany({
      where: {
        id: {
          in: merchandiseIds,
        },
      },
    });

    const foundIds = merchandise.map(m => m.id);
    const missingIds = merchandiseIds.filter(id => !foundIds.includes(id));
    
    if (missingIds.length > 0) {
      errors.push(`Merchandise not found: ${missingIds.join(', ')}`);
    }

    const unavailableItems = merchandise.filter(m => !m.isAvailable);
    if (unavailableItems.length > 0) {
      errors.push(`Unavailable merchandise: ${unavailableItems.map(m => m.name).join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async validateGroupItems(merchandiseIds: string[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const merchandise = await prisma.merchandise.findMany({
      where: {
        id: {
          in: merchandiseIds,
        },
      },
    });

    const errors: string[] = [];
    const baseItems = merchandise.filter(m => m.type === 'BASE_ITEM');
    const toppings = merchandise.filter(m => m.type === 'TOPPING');
    const discounts = merchandise.filter(m => m.type === 'DISCOUNT');

    // Rule 1: グループには最大1つのBASE_ITEMのみ
    if (baseItems.length > 1) {
      errors.push('A group can contain at most one BASE_ITEM');
    }

    // Rule 2: TOPPINGやDISCOUNTはBASE_ITEMがある場合のみ追加可能
    if ((toppings.length > 0 || discounts.length > 0) && baseItems.length === 0) {
      errors.push('TOPPING or DISCOUNT items can only be added to a group that contains a BASE_ITEM');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}