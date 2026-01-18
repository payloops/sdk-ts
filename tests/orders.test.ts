import { describe, it, expect, beforeAll } from 'vitest';
import { Loop, NotFoundError } from '../src';
import { setupTestMerchant, configureProcessor, type TestMerchant } from './helpers';

/**
 * Functional tests for Orders resource
 * These tests run against a real backend API
 */

describe('Orders - Functional Tests', () => {
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

    // Configure a processor for the merchant
    await configureProcessor(merchant.token, 'stripe');
  }, 30000);

  describe('orders.create()', () => {
    it('should create an order with minimal params', async () => {
      const order = await loop.orders.create({
        amount: 1000,
      });

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.amount).toBe(1000);
      expect(order.currency).toBe('USD');
      expect(order.status).toBe('pending');
    });

    it('should create an order with all params', async () => {
      const externalId = `test-${Date.now()}`;
      const order = await loop.orders.create({
        amount: 2500,
        currency: 'EUR',
        externalId,
        customerId: 'cust_123',
        customerEmail: 'test@example.com',
        description: 'Test order',
        metadata: { source: 'sdk-test' },
        returnUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.amount).toBe(2500);
      expect(order.currency).toBe('EUR');
      expect(order.externalId).toBe(externalId);
      expect(order.status).toBe('pending');
    });

    it('should reject invalid amount (negative)', async () => {
      await expect(
        loop.orders.create({
          amount: -100,
        })
      ).rejects.toThrow();
    });

    it('should reject zero amount', async () => {
      await expect(
        loop.orders.create({
          amount: 0,
        })
      ).rejects.toThrow();
    });
  });

  describe('orders.get()', () => {
    it('should get an existing order', async () => {
      // First create an order
      const created = await loop.orders.create({
        amount: 1500,
        currency: 'USD',
      });

      // Then fetch it
      const order = await loop.orders.get(created.id);

      expect(order).toBeDefined();
      expect(order.id).toBe(created.id);
      expect(order.amount).toBe(1500);
      expect(order.currency).toBe('USD');
      expect(order.status).toBe('pending');
    });

    it('should throw NotFoundError for non-existent order', async () => {
      await expect(loop.orders.get('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });

  describe('orders.getTransactions()', () => {
    it('should return empty array for new order', async () => {
      const order = await loop.orders.create({ amount: 1000 });
      const transactions = await loop.orders.getTransactions(order.id);

      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBe(0);
    });

    it('should throw NotFoundError for non-existent order', async () => {
      await expect(loop.orders.getTransactions('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });

  describe('orders.refund()', () => {
    it('should reject refund on pending order', async () => {
      const order = await loop.orders.create({ amount: 1000 });

      // Refund should fail on pending order
      await expect(loop.orders.refund(order.id)).rejects.toThrow();
    });

    it('should throw error for non-existent order', async () => {
      // The backend might throw NotFoundError or ValidationError depending on how the request is processed
      await expect(loop.orders.refund('00000000-0000-0000-0000-000000000000')).rejects.toThrow();
    });
  });

  describe('orders.getRefunds()', () => {
    it('should return empty array for order without refunds', async () => {
      const order = await loop.orders.create({ amount: 1000 });
      const refunds = await loop.orders.getRefunds(order.id);

      expect(Array.isArray(refunds)).toBe(true);
      expect(refunds.length).toBe(0);
    });

    it('should throw NotFoundError for non-existent order', async () => {
      await expect(loop.orders.getRefunds('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });
});
