import type { LoopClient } from '../client';
import type {
  Order,
  CreateOrderParams,
  PayOrderParams,
  PayOrderResult,
  Transaction,
  RefundParams,
  Refund
} from '../types';

export class OrdersResource {
  constructor(private client: LoopClient) {}

  /**
   * Create a new payment order
   */
  async create(params: CreateOrderParams): Promise<Order> {
    return this.client.post<Order>('/v1/orders', params);
  }

  /**
   * Get an order by ID
   */
  async get(orderId: string): Promise<Order> {
    return this.client.get<Order>(`/v1/orders/${orderId}`);
  }

  /**
   * Process payment for an order
   */
  async pay(orderId: string, params?: PayOrderParams): Promise<PayOrderResult> {
    return this.client.post<PayOrderResult>(`/v1/orders/${orderId}/pay`, params);
  }

  /**
   * Get all transactions for an order
   */
  async getTransactions(orderId: string): Promise<Transaction[]> {
    return this.client.get<Transaction[]>(`/v1/orders/${orderId}/transactions`);
  }

  /**
   * Initiate a refund for an order
   */
  async refund(orderId: string, params?: RefundParams): Promise<Refund> {
    return this.client.post<Refund>(`/v1/orders/${orderId}/refund`, params);
  }

  /**
   * Get all refunds for an order
   */
  async getRefunds(orderId: string): Promise<Refund[]> {
    return this.client.get<Refund[]>(`/v1/orders/${orderId}/refunds`);
  }
}
