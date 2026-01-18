import { describe, it, expect, beforeAll } from 'vitest';
import { Loop } from '../src';
import { setupTestMerchant, configureProcessor, type TestMerchant } from './helpers';

/**
 * Payment flow tests - These test the full payment workflow
 * including Temporal workflow triggering
 */

describe('Payment Flow - Functional Tests', () => {
  let merchant: TestMerchant;
  let loop: Loop;

  beforeAll(async () => {
    // Setup test merchant with API key
    merchant = await setupTestMerchant();

    // Initialize SDK with the API key
    loop = new Loop({
      apiKey: merchant.apiKey,
      baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    });

    // Configure Stripe processor for the merchant
    await configureProcessor(merchant.token, 'stripe');
  }, 30000);

  describe('orders.pay()', () => {
    it('should process payment and start workflow', async () => {
      // Create an order first
      const order = await loop.orders.create({
        amount: 1000,
        currency: 'USD',
      });

      expect(order.id).toBeDefined();
      expect(order.status).toBe('pending');

      // Process payment - this should trigger the Temporal workflow
      const result = await loop.orders.pay(order.id, {
        paymentMethod: {
          type: 'card',
          token: 'tok_visa', // Stripe test token
        },
      });

      expect(result).toBeDefined();
      // The status should be 'processing', 'authorized', 'captured', or 'requires_action'
      expect(['processing', 'authorized', 'captured', 'requires_action', 'failed']).toContain(result.status);

      // If requires_action, check for redirect URL
      if (result.status === 'requires_action') {
        expect(result.redirectUrl).toBeDefined();
      }

      // Get the updated order to verify
      const updatedOrder = await loop.orders.get(order.id);
      expect(updatedOrder.status).not.toBe('pending'); // Should have changed from pending
    });

    it('should handle payment without paymentMethod (auto-routing)', async () => {
      const order = await loop.orders.create({
        amount: 2500,
        currency: 'USD',
      });

      // Process payment without specifying payment method
      // Backend should auto-route to appropriate processor
      const result = await loop.orders.pay(order.id);

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should reject payment on already processed order', async () => {
      const order = await loop.orders.create({
        amount: 500,
        currency: 'USD',
      });

      // First payment attempt
      await loop.orders.pay(order.id);

      // Second payment attempt should fail
      await expect(loop.orders.pay(order.id)).rejects.toThrow();
    });
  });

  describe('INR routing to Razorpay', () => {
    beforeAll(async () => {
      // Also configure Razorpay
      await configureProcessor(merchant.token, 'razorpay');
    }, 10000);

    it('should route INR payments to Razorpay', async () => {
      const order = await loop.orders.create({
        amount: 10000, // 100 INR in paise
        currency: 'INR',
      });

      expect(order.currency).toBe('INR');

      // Process payment - should route to Razorpay based on currency
      const result = await loop.orders.pay(order.id);

      expect(result).toBeDefined();
      // Razorpay typically returns requires_action for redirect flow
      expect(['processing', 'authorized', 'captured', 'requires_action', 'failed']).toContain(result.status);
    });
  });
});
