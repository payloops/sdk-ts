import type { LoopClient } from '../client';
import type { CheckoutSessionParams, CheckoutSession } from '../types';

export class CheckoutResource {
  constructor(private client: LoopClient) {}

  /**
   * Create a new checkout session
   * Returns a URL to redirect the customer to
   */
  async createSession(params: CheckoutSessionParams): Promise<CheckoutSession> {
    return this.client.post<CheckoutSession>('/v1/checkout/sessions', params);
  }

  /**
   * Get a checkout session by ID
   */
  async getSession(sessionId: string): Promise<CheckoutSession> {
    return this.client.get<CheckoutSession>(`/v1/checkout/sessions/${sessionId}`);
  }
}
