import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { Loop, Webhooks } from '../src';

/**
 * Functional tests for Webhook verification
 * These tests don't require a running backend
 */

describe('Webhooks - Functional Tests', () => {
  const webhookSecret = 'whsec_test_secret_123';

  // Helper to create a valid signature
  function createSignature(payload: string, secret: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const signaturePayload = `${ts}.${payload}`;
    const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
    return `t=${ts},v1=${signature}`;
  }

  describe('Webhooks.verify()', () => {
    it('should verify a valid webhook signature', () => {
      const payload = JSON.stringify({
        id: 'evt_123',
        eventType: 'order.completed',
        orderId: 'ord_123',
        amount: 1000,
        currency: 'USD',
        status: 'captured',
        createdAt: new Date().toISOString(),
        payload: { test: true },
      });

      const signature = createSignature(payload, webhookSecret);

      const event = Webhooks.verify({
        payload,
        signature,
        secret: webhookSecret,
      });

      expect(event).toBeDefined();
      expect(event.id).toBe('evt_123');
      expect(event.eventType).toBe('order.completed');
      expect(event.orderId).toBe('ord_123');
      expect(event.amount).toBe(1000);
    });

    it('should verify webhook with Buffer payload', () => {
      const payloadObj = {
        id: 'evt_456',
        eventType: 'order.failed',
        orderId: 'ord_456',
        createdAt: new Date().toISOString(),
        payload: {},
      };
      const payloadStr = JSON.stringify(payloadObj);
      const payloadBuffer = Buffer.from(payloadStr);

      const signature = createSignature(payloadStr, webhookSecret);

      const event = Webhooks.verify({
        payload: payloadBuffer,
        signature,
        secret: webhookSecret,
      });

      expect(event).toBeDefined();
      expect(event.id).toBe('evt_456');
      expect(event.eventType).toBe('order.failed');
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({
        id: 'evt_789',
        eventType: 'order.completed',
        createdAt: new Date().toISOString(),
        payload: {},
      });

      // Use current timestamp so it doesn't fail on timestamp check first
      const currentTimestamp = Date.now();

      // Use a signature that is the same length as a valid SHA256 hex (64 chars)
      // but with wrong content
      const fakeSignature = 'a'.repeat(64);

      expect(() =>
        Webhooks.verify({
          payload,
          signature: `t=${currentTimestamp},v1=${fakeSignature}`,
          secret: webhookSecret,
        })
      ).toThrow('Invalid webhook signature');
    });

    it('should reject expired timestamp', () => {
      const payload = JSON.stringify({
        id: 'evt_old',
        eventType: 'order.completed',
        createdAt: new Date().toISOString(),
        payload: {},
      });

      // Create signature with timestamp from 10 minutes ago
      const oldTimestamp = Date.now() - 10 * 60 * 1000;
      const signature = createSignature(payload, webhookSecret, oldTimestamp);

      expect(() =>
        Webhooks.verify({
          payload,
          signature,
          secret: webhookSecret,
          tolerance: 300, // 5 minutes
        })
      ).toThrow('Webhook timestamp too old');
    });

    it('should accept timestamp within tolerance', () => {
      const payload = JSON.stringify({
        id: 'evt_recent',
        eventType: 'order.completed',
        createdAt: new Date().toISOString(),
        payload: {},
      });

      // Create signature with timestamp from 2 minutes ago
      const recentTimestamp = Date.now() - 2 * 60 * 1000;
      const signature = createSignature(payload, webhookSecret, recentTimestamp);

      const event = Webhooks.verify({
        payload,
        signature,
        secret: webhookSecret,
        tolerance: 300, // 5 minutes
      });

      expect(event).toBeDefined();
      expect(event.id).toBe('evt_recent');
    });

    it('should reject missing v1 signature', () => {
      const payload = JSON.stringify({
        id: 'evt_no_sig',
        eventType: 'order.completed',
        createdAt: new Date().toISOString(),
        payload: {},
      });

      expect(() =>
        Webhooks.verify({
          payload,
          signature: 't=123456789',
          secret: webhookSecret,
        })
      ).toThrow('Invalid signature format');
    });

    it('should handle simple v1=signature format', () => {
      const payload = JSON.stringify({
        id: 'evt_simple',
        eventType: 'order.completed',
        createdAt: new Date().toISOString(),
        payload: {},
      });

      // Simple format without timestamp
      const signature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

      const event = Webhooks.verify({
        payload,
        signature: `v1=${signature}`,
        secret: webhookSecret,
      });

      expect(event).toBeDefined();
      expect(event.id).toBe('evt_simple');
    });
  });

  describe('Webhooks.constructEvent()', () => {
    it('should parse webhook payload without verification', () => {
      const payload = JSON.stringify({
        id: 'evt_unverified',
        eventType: 'order.refunded',
        orderId: 'ord_999',
        amount: 500,
        createdAt: new Date().toISOString(),
        payload: { refundReason: 'customer_request' },
      });

      const event = Webhooks.constructEvent(payload);

      expect(event).toBeDefined();
      expect(event.id).toBe('evt_unverified');
      expect(event.eventType).toBe('order.refunded');
      expect(event.amount).toBe(500);
    });

    it('should parse Buffer payload', () => {
      const payloadObj = {
        id: 'evt_buffer',
        eventType: 'order.completed',
        createdAt: new Date().toISOString(),
        payload: {},
      };
      const payloadBuffer = Buffer.from(JSON.stringify(payloadObj));

      const event = Webhooks.constructEvent(payloadBuffer);

      expect(event).toBeDefined();
      expect(event.id).toBe('evt_buffer');
    });
  });

  describe('Loop.webhooks static access', () => {
    it('should access Webhooks class via Loop.webhooks', () => {
      expect(Loop.webhooks).toBe(Webhooks);
      expect(typeof Loop.webhooks.verify).toBe('function');
      expect(typeof Loop.webhooks.constructEvent).toBe('function');
    });
  });
});
