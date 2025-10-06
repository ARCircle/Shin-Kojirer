const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Merchandise {
  id: string;
  name: string;
  price: number;
  type: 'BASE_ITEM' | 'TOPPING' | 'DISCOUNT';
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  merchandiseId: string;
  merchandise?: Merchandise;
}

export interface OrderItemGroup {
  id: string;
  status: 'NOT_READY' | 'PREPARING' | 'READY';
  items: OrderItem[];
}

export type OrderStatus =
  | 'ORDERED'
  | 'PAID'
  | 'COOKING'
  | 'READY'
  | 'COMPLETED';

export interface Order {
  id: string;
  callNum: number;
  status: OrderStatus;
  groups: OrderItemGroup[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  groups: {
    items: {
      merchandiseId: string;
    }[];
  }[];
}

class ApiClient {
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  // Merchandise endpoints
  async getMerchandise(): Promise<Merchandise[]> {
    return this.fetch<Merchandise[]>('/merchandise');
  }

  async createMerchandise(
    merchandise: Omit<Merchandise, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Merchandise> {
    return this.fetch<Merchandise>('/merchandise', {
      method: 'POST',
      body: JSON.stringify(merchandise),
    });
  }

  async setMerchandisePrice(id: string, price: number): Promise<void> {
    await this.fetch(`/merchandise/${id}/prices`, {
      method: 'POST',
      body: JSON.stringify({
        price,
        since: new Date().toISOString(),
      }),
    });
  }

  // Order endpoints
  async createOrder(input: CreateOrderInput): Promise<Order> {
    return this.fetch<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getOrder(id: string): Promise<Order> {
    return this.fetch<Order>(`/orders/${id}`);
  }

  async getAllOrders(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Order[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));

    const query = searchParams.toString();
    return this.fetch<Order[]>(`/orders${query ? `?${query}` : ''}`);
  }

  async payOrder(id: string): Promise<Order> {
    return this.fetch<Order>(`/orders/${id}/pay`, {
      method: 'POST',
    });
  }

  // OrderItemGroup endpoints
  async prepareGroup(groupId: string): Promise<void> {
    await this.fetch(`/order-item-groups/${groupId}/prepare`, {
      method: 'POST',
    });
  }

  async markGroupReady(groupId: string): Promise<void> {
    await this.fetch(`/order-item-groups/${groupId}/ready`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
