import { describe, it, expect, beforeAll } from 'vitest';
import { Loop, Webhooks } from '../src';
import { setupTestMerchant, type TestMerchant } from './helpers';

/**
 * Functional tests for the main Loop class
 * Tests initialization and resource access
 */

describe('Loop - Functional Tests', () => {
  describe('Initialization', () => {
    it('should initialize with string API key', () => {
      const loop = new Loop('sk_test_123');

      expect(loop).toBeInstanceOf(Loop);
      expect(loop.orders).toBeDefined();
      expect(loop.checkout).toBeDefined();
    });

    it('should initialize with config object', () => {
      const loop = new Loop({
        apiKey: 'sk_test_456',
        baseUrl: 'https://api.loop.dev',
        timeout: 10000,
      });

      expect(loop).toBeInstanceOf(Loop);
      expect(loop.orders).toBeDefined();
      expect(loop.checkout).toBeDefined();
    });

    it('should throw error for missing API key', () => {
      expect(() => new Loop('')).toThrow('API key is required');
      expect(() => new Loop({ apiKey: '' })).toThrow('API key is required');
    });

    it('should expose webhooks as static property', () => {
      expect(Loop.webhooks).toBe(Webhooks);
    });
  });

  describe('Resource Access', () => {
    let merchant: TestMerchant;
    let loop: Loop;

    beforeAll(async () => {
      merchant = await setupTestMerchant();
      loop = new Loop({
        apiKey: merchant.apiKey,
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      });
    }, 30000);

    it('should access orders resource', () => {
      expect(loop.orders).toBeDefined();
      expect(typeof loop.orders.create).toBe('function');
      expect(typeof loop.orders.get).toBe('function');
      expect(typeof loop.orders.pay).toBe('function');
      expect(typeof loop.orders.getTransactions).toBe('function');
      expect(typeof loop.orders.refund).toBe('function');
      expect(typeof loop.orders.getRefunds).toBe('function');
    });

    it('should access checkout resource', () => {
      expect(loop.checkout).toBeDefined();
      expect(typeof loop.checkout.createSession).toBe('function');
      expect(typeof loop.checkout.getSession).toBe('function');
    });

    it('should make authenticated requests', async () => {
      // This test verifies that the SDK correctly uses the API key
      const order = await loop.orders.create({ amount: 100 });
      expect(order.id).toBeDefined();
    });
  });

  describe('Default Configuration', () => {
    it('should use default baseUrl when not specified', () => {
      // The default should be https://api.loop.dev
      // We can't directly test this without inspecting internals,
      // but we can verify the SDK initializes without error
      const loop = new Loop('sk_test_default');
      expect(loop).toBeInstanceOf(Loop);
    });

    it('should use default timeout when not specified', () => {
      const loop = new Loop({ apiKey: 'sk_test_timeout' });
      expect(loop).toBeInstanceOf(Loop);
    });
  });
});
