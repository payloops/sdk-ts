import type { LoopConfig } from './types';
import {
  LoopError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError
} from './errors';

const DEFAULT_BASE_URL = 'https://api.loop.dev';
const DEFAULT_TIMEOUT = 30000;

export class LoopClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: LoopConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'User-Agent': '@payloops/sdk/0.0.1'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          code: 'unknown',
          message: 'An error occurred'
        }));

        switch (response.status) {
          case 401:
            throw new AuthenticationError(error.message);
          case 400:
            throw new ValidationError(error.message);
          case 404:
            throw new NotFoundError('Resource');
          case 429:
            throw new RateLimitError();
          default:
            throw new LoopError(error.code, error.message, response.status);
        }
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof LoopError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new LoopError('timeout', 'Request timed out', 408);
      }

      throw new LoopError(
        'network_error',
        error instanceof Error ? error.message : 'Network error',
        0
      );
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
