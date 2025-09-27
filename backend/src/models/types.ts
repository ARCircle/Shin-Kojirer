import {
  Prisma,
  MerchandiseType,
  OrderStatus,
  OrderGroupStatus,
} from '@prisma/client';

// Base types from Prisma
export type Merchandise = Prisma.MerchandiseGetPayload<{}>;
export type Order = Prisma.OrderGetPayload<{}>;
export type OrderItemGroup = Prisma.OrderItemGroupGetPayload<{}>;
export type OrderItem = Prisma.OrderItemGetPayload<{}>;

// Types with relations
export type OrderWithGroups = Prisma.OrderGetPayload<{
  include: {
    groups: {
      include: {
        items: {
          include: {
            merchandise: true;
          };
        };
      };
    };
  };
}>;

export type OrderItemGroupWithItems = Prisma.OrderItemGroupGetPayload<{
  include: {
    items: {
      include: {
        merchandise: true;
      };
    };
  };
}>;

export type OrderItemWithMerchandise = Prisma.OrderItemGetPayload<{
  include: {
    merchandise: true;
  };
}>;

// Enums re-exported
export { MerchandiseType, OrderStatus, OrderGroupStatus };

// Input types for creating records
export type CreateMerchandiseInput = Prisma.MerchandiseCreateInput;
export type UpdateMerchandiseInput = Prisma.MerchandiseUpdateInput;

export type CreateOrderInput = Prisma.OrderCreateInput;
export type UpdateOrderInput = Prisma.OrderUpdateInput;

export type CreateOrderItemGroupInput = Prisma.OrderItemGroupCreateInput;
export type UpdateOrderItemGroupInput = Prisma.OrderItemGroupUpdateInput;

export type CreateOrderItemInput = Prisma.OrderItemCreateInput;

// Custom input types for API
export interface CreateOrderRequestInput {
  groups: {
    items: {
      merchandiseId: string;
    }[];
  }[];
}

export interface SetPriceInput {
  price: number;
  since: string;
}

// Response types
export interface OrderResponse {
  id: string;
  callNum: number;
  status: OrderStatus;
  groups: OrderItemGroupResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemGroupResponse {
  id: string;
  status: OrderGroupStatus;
  items: OrderItemResponse[];
}

export interface OrderItemResponse {
  id: string;
  merchandiseId: string;
  merchandise?: Merchandise;
}

export interface MerchandiseResponse {
  id: string;
  name: string;
  price: number;
  type: MerchandiseType;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
