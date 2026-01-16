import crypto from 'crypto';
import type { WebhookEvent } from './types';

export interface WebhookVerifyOptions {
  payload: string | Buffer;
  signature: string;
  secret: string;
  tolerance?: number; // timestamp tolerance in seconds
}

export class Webhooks {
  /**
   * Verify a webhook signature
   * @throws Error if signature is invalid
   */
  static verify(options: WebhookVerifyOptions): WebhookEvent {
    const { payload, signature, secret, tolerance = 300 } = options;

    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');

    // Parse signature header (format: v1=signature)
    const signatureParts = signature.split(',');
    let timestamp: string | undefined;
    let v1Signature: string | undefined;

    for (const part of signatureParts) {
      const [key, value] = part.trim().split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        v1Signature = value;
      }
    }

    // Also try the simpler format: v1=signature
    if (!v1Signature && signature.startsWith('v1=')) {
      v1Signature = signature.slice(3);
    }

    if (!v1Signature) {
      throw new Error('Invalid signature format');
    }

    // Get timestamp from header if present, or extract from payload
    const timestampHeader = signatureParts.find((p) => p.startsWith('t='));
    const ts = timestamp || (timestampHeader ? timestampHeader.split('=')[1] : undefined);

    // Verify timestamp tolerance if we have a timestamp
    if (ts) {
      const timestampMs = parseInt(ts, 10);
      const now = Date.now();
      const diff = Math.abs(now - timestampMs);

      if (diff > tolerance * 1000) {
        throw new Error('Webhook timestamp too old');
      }
    }

    // Compute expected signature
    const signaturePayload = ts ? `${ts}.${payloadStr}` : payloadStr;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(v1Signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    // Parse and return the event
    return JSON.parse(payloadStr) as WebhookEvent;
  }

  /**
   * Construct a webhook event from raw payload
   * Use this if you need to parse without verification (not recommended)
   */
  static constructEvent(payload: string | Buffer): WebhookEvent {
    const payloadStr = typeof payload === 'string' ? payload : payload.toString('utf8');
    return JSON.parse(payloadStr) as WebhookEvent;
  }
}
