export interface LoopConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'requires_action';

export type Processor = 'stripe' | 'razorpay';

export interface Order {
  id: string;
  externalId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  processor: Processor | null;
  processorOrderId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  externalId?: string;
  customerId?: string;
  customerEmail?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayOrderParams {
  processor?: Processor;
  paymentMethod?: {
    type: 'card' | 'upi' | 'netbanking' | 'wallet';
    token?: string;
  };
}

export interface PayOrderResult {
  orderId: string;
  status: OrderStatus;
  processor: Processor;
  workflowId?: string;
  redirectUrl?: string;
  clientSecret?: string;
  processorData?: Record<string, unknown>;
}

export interface Transaction {
  id: string;
  orderId: string;
  type: 'authorization' | 'capture' | 'refund' | 'void';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  processorTransactionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface RefundParams {
  amount?: number;
  reason?: string;
}

export interface Refund {
  refundId: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
}

export interface CheckoutSessionParams {
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, unknown>;
  lineItems?: Array<{
    name: string;
    amount: number;
    quantity: number;
  }>;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: string;
}

export interface LoopError {
  code: string;
  message: string;
  status: number;
}

export interface WebhookEvent {
  id: string;
  eventType: string;
  orderId?: string;
  externalId?: string;
  amount?: number;
  currency?: string;
  status?: OrderStatus;
  processor?: Processor;
  createdAt: string;
  payload: Record<string, unknown>;
}
