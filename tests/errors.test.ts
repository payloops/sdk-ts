import { describe, it, expect, beforeAll } from 'vitest';
import {
  Loop,
  LoopError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  ProcessorError,
} from '../src';
import { setupTestMerchant, type TestMerchant } from './helpers';

/**
 * Functional tests for error handling
 * Tests that the SDK correctly handles and throws appropriate errors
 */

describe('Errors - Functional Tests', () => {
  describe('Error Classes', () => {
    it('should create LoopError with correct properties', () => {
      const error = new LoopError('test_error', 'Test error message', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LoopError);
      expect(error.name).toBe('LoopError');
      expect(error.code).toBe('test_error');
      expect(error.message).toBe('Test error message');
      expect(error.status).toBe(500);
    });

    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError();

      expect(error).toBeInstanceOf(LoopError);
      expect(error.name).toBe('AuthenticationError');
      expect(error.code).toBe('authentication_error');
      expect(error.message).toBe('Invalid API key');
      expect(error.status).toBe(401);
    });

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Custom auth error');

      expect(error.message).toBe('Custom auth error');
      expect(error.status).toBe(401);
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid amount');

      expect(error).toBeInstanceOf(LoopError);
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('validation_error');
      expect(error.message).toBe('Invalid amount');
      expect(error.status).toBe(400);
    });

    it('should create NotFoundError', () => {
      const error = new NotFoundError('Order');

      expect(error).toBeInstanceOf(LoopError);
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('not_found');
      expect(error.message).toBe('Order not found');
      expect(error.status).toBe(404);
    });

    it('should create RateLimitError', () => {
      const error = new RateLimitError();

      expect(error).toBeInstanceOf(LoopError);
      expect(error.name).toBe('RateLimitError');
      expect(error.code).toBe('rate_limit');
      expect(error.message).toBe('Too many requests');
      expect(error.status).toBe(429);
    });

    it('should create ProcessorError without processor code', () => {
      const error = new ProcessorError('Payment declined');

      expect(error).toBeInstanceOf(LoopError);
      expect(error.name).toBe('ProcessorError');
      expect(error.code).toBe('processor_error');
      expect(error.message).toBe('Payment declined');
      expect(error.status).toBe(400);
      expect(error.processorCode).toBeUndefined();
    });

    it('should create ProcessorError with processor code', () => {
      const error = new ProcessorError('Card declined', 'card_declined');

      expect(error.processorCode).toBe('card_declined');
    });
  });

  describe('API Error Handling', () => {
    let merchant: TestMerchant;

    beforeAll(async () => {
      merchant = await setupTestMerchant();
    }, 30000);

    it('should throw AuthenticationError for invalid API key', async () => {
      const invalidLoop = new Loop({
        apiKey: 'sk_test_invalid_key',
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      });

      await expect(invalidLoop.orders.create({ amount: 1000 })).rejects.toThrow(AuthenticationError);
    });

    it('should throw NotFoundError for non-existent resource', async () => {
      const loop = new Loop({
        apiKey: merchant.apiKey,
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      });

      await expect(loop.orders.get('00000000-0000-0000-0000-000000000000')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid request', async () => {
      const loop = new Loop({
        apiKey: merchant.apiKey,
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      });

      // Amount must be positive integer
      await expect(loop.orders.create({ amount: -100 })).rejects.toThrow(ValidationError);
    });

    it('should include error details in thrown error', async () => {
      const loop = new Loop({
        apiKey: merchant.apiKey,
        baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      });

      try {
        await loop.orders.get('00000000-0000-0000-0000-000000000000');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        if (error instanceof NotFoundError) {
          expect(error.code).toBe('not_found');
          expect(error.status).toBe(404);
        }
      }
    });
  });

  describe('SDK Initialization Errors', () => {
    it('should throw error when API key is missing', () => {
      expect(() => new Loop({ apiKey: '' })).toThrow('API key is required');
    });

    it('should accept string API key directly', () => {
      const loop = new Loop('sk_test_valid_key');
      expect(loop).toBeInstanceOf(Loop);
    });

    it('should accept config object', () => {
      const loop = new Loop({
        apiKey: 'sk_test_valid_key',
        baseUrl: 'https://api.example.com',
        timeout: 5000,
      });
      expect(loop).toBeInstanceOf(Loop);
    });
  });
});
