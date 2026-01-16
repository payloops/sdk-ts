import { LoopClient } from './client';
import { OrdersResource } from './resources/orders';
import { CheckoutResource } from './resources/checkout';
import { Webhooks } from './webhooks';
import type { LoopConfig } from './types';

export class Loop {
  private client: LoopClient;

  /**
   * Orders API - create and manage payment orders
   */
  orders: OrdersResource;

  /**
   * Checkout API - create hosted checkout sessions
   */
  checkout: CheckoutResource;

  /**
   * Webhook utilities for verifying webhook signatures
   */
  static webhooks = Webhooks;

  constructor(config: LoopConfig | string) {
    const normalizedConfig: LoopConfig =
      typeof config === 'string' ? { apiKey: config } : config;

    this.client = new LoopClient(normalizedConfig);
    this.orders = new OrdersResource(this.client);
    this.checkout = new CheckoutResource(this.client);
  }
}

// Export types
export type {
  LoopConfig,
  Order,
  OrderStatus,
  Processor,
  CreateOrderParams,
  PayOrderParams,
  PayOrderResult,
  Transaction,
  RefundParams,
  Refund,
  CheckoutSessionParams,
  CheckoutSession,
  WebhookEvent
} from './types';

// Export errors
export {
  LoopError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ProcessorError
} from './errors';

// Export webhooks helper
export { Webhooks } from './webhooks';

// Default export
export default Loop;
