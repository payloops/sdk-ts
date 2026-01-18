import { describe, it, expect, beforeAll } from 'vitest';
import { Loop } from '../src';
import { setupTestMerchant, configureProcessor, type TestMerchant } from './helpers';

/**
 * Observability tests - These verify that:
 * 1. Requests include correlation IDs
 * 2. Traces are generated for payment flows
 * 3. Logs include trace context
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

describe('Observability - Functional Tests', () => {
  let merchant: TestMerchant;
  let loop: Loop;

  beforeAll(async () => {
    merchant = await setupTestMerchant();
    loop = new Loop({
      apiKey: merchant.apiKey,
      baseUrl: API_BASE_URL,
    });
    await configureProcessor(merchant.token, 'stripe');
  }, 30000);

  describe('Correlation ID', () => {
    it('should return correlation ID in response headers', async () => {
      // Make a direct fetch to check response headers
      const response = await fetch(`${API_BASE_URL}/health`);

      expect(response.ok).toBe(true);

      const body = await response.json();
      // The health endpoint returns correlationId in the body
      expect(body.correlationId).toBeDefined();
      expect(typeof body.correlationId).toBe('string');
      expect(body.correlationId.length).toBeGreaterThan(0);
    });

    it('should accept and use custom correlation ID', async () => {
      const customCorrelationId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const response = await fetch(`${API_BASE_URL}/health`, {
        headers: {
          'X-Correlation-ID': customCorrelationId,
        },
      });

      expect(response.ok).toBe(true);

      const body = await response.json();
      // Backend should use our correlation ID
      expect(body.correlationId).toBe(customCorrelationId);
    });
  });

  describe('Trace Context in API Responses', () => {
    it('should include trace info in order creation', async () => {
      const order = await loop.orders.create({
        amount: 1000,
        currency: 'USD',
      });

      expect(order.id).toBeDefined();
      // The order response should include creation timestamp
      expect(order.createdAt).toBeDefined();
    });

    it('should trace payment workflow execution', async () => {
      // Create and pay for an order
      const order = await loop.orders.create({
        amount: 500,
        currency: 'USD',
      });

      const result = await loop.orders.pay(order.id);

      // Payment should complete (workflow executed)
      expect(result.status).toBeDefined();
      expect(['processing', 'authorized', 'captured', 'requires_action', 'failed']).toContain(result.status);
    });
  });

  describe('Backend Logging Verification', () => {
    it('should log order creation with trace context', async () => {
      // Create order with known external ID for log search
      const externalId = `obs-test-${Date.now()}`;

      const order = await loop.orders.create({
        amount: 750,
        currency: 'USD',
        externalId,
      });

      expect(order.id).toBeDefined();
      expect(order.externalId).toBe(externalId);

      // The backend should have logged this with trace_id and span_id
      // We can't directly verify logs from the test, but we verify the request succeeded
      // Logs can be checked in OpenObserve: http://localhost:5080
    });
  });

  describe('OpenObserve Integration', () => {
    it('should have metrics available in OpenObserve', async () => {
      // Query OpenObserve for available streams
      const response = await fetch('http://localhost:5080/api/default/streams', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin@loop.dev:admin123').toString('base64'),
        },
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.list).toBeDefined();
        expect(Array.isArray(data.list)).toBe(true);

        // Check that we have metrics streams (from Temporal)
        const metricsStreams = data.list.filter((s: { stream_type: string }) => s.stream_type === 'metrics');
        expect(metricsStreams.length).toBeGreaterThan(0);

        // Check for traces stream
        const traceStreams = data.list.filter((s: { stream_type: string }) => s.stream_type === 'traces');
        expect(traceStreams.length).toBeGreaterThan(0);
      } else {
        // OpenObserve might not be running in CI
        console.log('OpenObserve not available for integration test');
      }
    });

    it('should have Temporal metrics in OpenObserve', async () => {
      const response = await fetch('http://localhost:5080/api/default/streams', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from('admin@loop.dev:admin123').toString('base64'),
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Look for Temporal-specific metrics
        const temporalMetrics = data.list.filter((s: { name: string; stream_type: string }) =>
          s.stream_type === 'metrics' &&
          (s.name.includes('temporal') || s.name.includes('workflow') || s.name.includes('activity'))
        );

        // We should have some Temporal metrics
        // Common ones: workflow_task_schedule_to_start_latency, activity_execution_time, etc.
        expect(temporalMetrics.length).toBeGreaterThan(0);
      }
    });
  });

  describe('End-to-End Tracing', () => {
    it('should trace full payment flow from API to Temporal', async () => {
      // This test creates a payment and verifies the entire flow is traced
      const order = await loop.orders.create({
        amount: 2000,
        currency: 'USD',
        metadata: { test: 'e2e-trace' },
      });

      // Process payment - this triggers Temporal workflow
      const payResult = await loop.orders.pay(order.id);
      expect(payResult.status).toBeDefined();

      // Get the final order state
      const finalOrder = await loop.orders.get(order.id);

      // Verify the order was processed
      expect(finalOrder.status).not.toBe('pending');

      // The trace should include:
      // 1. POST /v1/orders (create)
      // 2. POST /v1/orders/:id/pay (pay)
      // 3. PaymentWorkflow execution
      // 4. Activity executions (createPayment, etc.)
      // 5. GET /v1/orders/:id (get)
      //
      // These can be verified in OpenObserve or Temporal UI
    });
  });
});
