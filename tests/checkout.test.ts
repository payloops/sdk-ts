import { describe, it, expect, beforeAll } from 'vitest';
import { Loop, NotFoundError } from '../src';
import { setupTestMerchant, type TestMerchant } from './helpers';

/**
 * Functional tests for Checkout resource
 * These tests run against a real backend API
 */

describe('Checkout - Functional Tests', () => {
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
  }, 30000);

  describe('checkout.createSession()', () => {
    it('should create a checkout session with required params', async () => {
      const session = await loop.checkout.createSession({
        amount: 5000,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.url).toBeDefined();
      expect(session.url).toContain('/checkout/');
      expect(session.expiresAt).toBeDefined();
    });

    it('should create a checkout session with all params', async () => {
      const session = await loop.checkout.createSession({
        amount: 10000,
        currency: 'EUR',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        customerId: 'cust_123',
        customerEmail: 'customer@example.com',
        metadata: { orderId: 'test-123' },
        lineItems: [
          { name: 'Product A', amount: 5000, quantity: 1 },
          { name: 'Product B', amount: 2500, quantity: 2 },
        ],
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.url).toBeDefined();
      expect(session.expiresAt).toBeDefined();

      // Verify expiration is in the future
      const expiresAt = new Date(session.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject invalid amount', async () => {
      await expect(
        loop.checkout.createSession({
          amount: -100,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow();
    });

    it('should reject missing successUrl', async () => {
      await expect(
        loop.checkout.createSession({
          amount: 1000,
          successUrl: '',
          cancelUrl: 'https://example.com/cancel',
        } as any)
      ).rejects.toThrow();
    });

    it('should reject missing cancelUrl', async () => {
      await expect(
        loop.checkout.createSession({
          amount: 1000,
          successUrl: 'https://example.com/success',
          cancelUrl: '',
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('checkout.getSession()', () => {
    it('should get an existing checkout session', async () => {
      // First create a session
      const created = await loop.checkout.createSession({
        amount: 7500,
        currency: 'USD',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      // Then fetch it
      const session = await loop.checkout.getSession(created.id);

      expect(session).toBeDefined();
      expect(session.id).toBe(created.id);
      expect(session.url).toBe(created.url);
      expect(session.expiresAt).toBe(created.expiresAt);
    });

    it('should throw NotFoundError for non-existent session', async () => {
      await expect(loop.checkout.getSession('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });
  });
});
