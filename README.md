# PayLoops SDK for TypeScript

The official TypeScript/JavaScript SDK for integrating PayLoops into your application. Accept payments with a single integration—regardless of which payment processors you use behind the scenes.

## Role in the Platform

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                          YOUR APPLICATION                               │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                 ★ SDK-TS (this package) ★                        │  │
│   │                                                                  │  │
│   │  // One integration, multiple processors                        │  │
│   │  const payloops = new PayLoops('sk_live_...');                  │  │
│   │                                                                  │  │
│   │  const order = await payloops.orders.create({ ... });           │  │
│   │  const payment = await payloops.orders.pay(order.id, { ... });  │  │
│   │                                                                  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                               │                                         │
│                               │ HTTPS                                   │
│                               ▼                                         │
│                      PayLoops API (backend)                             │
│                               │                                         │
│              ┌────────────────┼────────────────┐                       │
│              ▼                ▼                ▼                       │
│           Stripe          Razorpay         PayPal                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why Use This SDK?

- **Single integration** - Connect once, use any processor
- **Type-safe** - Full TypeScript support with IntelliSense
- **Automatic retries** - Built-in retry logic for transient failures
- **Webhook verification** - Secure signature verification included
- **Tiny footprint** - Zero dependencies, ~5KB minified

## Installation

```bash
npm install @payloops/sdk
# or
yarn add @payloops/sdk
# or
pnpm add @payloops/sdk
```

## Quick Start

```typescript
import PayLoops from '@payloops/sdk';

// Initialize with your API key
const payloops = new PayLoops('sk_live_...');

// Create a payment order
const order = await payloops.orders.create({
  amount: 4999,              // Amount in cents ($49.99)
  currency: 'USD',
  customerEmail: 'customer@example.com',
  metadata: {
    productId: 'prod_premium',
    userId: 'user_123'
  }
});

// Process the payment
const payment = await payloops.orders.pay(order.id, {
  paymentMethod: {
    type: 'card',
    token: 'pm_...'          // Token from Stripe.js or similar
  }
});

// Handle the result
switch (payment.status) {
  case 'captured':
    console.log('Payment successful!');
    break;
  case 'requires_action':
    // Redirect for 3DS verification
    window.location.href = payment.redirectUrl;
    break;
  case 'failed':
    console.error('Payment failed:', payment.errorMessage);
    break;
}
```

## API Reference

### Orders

#### Create an Order

```typescript
const order = await payloops.orders.create({
  amount: 4999,                    // Required: amount in cents
  currency: 'USD',                 // Required: ISO currency code
  customerEmail: 'user@example.com',
  externalId: 'your-order-123',    // Your internal reference
  description: 'Premium Plan',
  returnUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  metadata: {                       // Arbitrary key-value pairs
    customField: 'value'
  }
});
```

#### Get Order Details

```typescript
const order = await payloops.orders.get('ord_xxx');

console.log(order.status);        // 'pending', 'captured', 'failed', etc.
console.log(order.processor);     // 'stripe' or 'razorpay'
console.log(order.amount);
```

#### Process Payment

```typescript
const result = await payloops.orders.pay('ord_xxx', {
  paymentMethod: {
    type: 'card',
    token: 'pm_xxx'               // From Stripe.js, Razorpay, etc.
  },
  processor: 'stripe'             // Optional: force specific processor
});
```

#### Refund

```typescript
// Full refund
const refund = await payloops.orders.refund('ord_xxx');

// Partial refund
const refund = await payloops.orders.refund('ord_xxx', {
  amount: 1000,                   // Refund $10.00
  reason: 'Customer request'
});
```

### Checkout Sessions

For hosted checkout pages:

```typescript
const session = await payloops.checkout.createSession({
  amount: 4999,
  currency: 'USD',
  successUrl: 'https://yoursite.com/success?session={SESSION_ID}',
  cancelUrl: 'https://yoursite.com/cancel',
  customerEmail: 'customer@example.com',
  lineItems: [
    { name: 'Premium Plan', amount: 4999, quantity: 1 }
  ]
});

// Redirect to hosted checkout
window.location.href = session.url;
```

### Webhooks

Verify webhook signatures to ensure authenticity:

```typescript
import { PayLoops } from '@payloops/sdk';

// Express.js example
app.post('/webhooks/payloops', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-payloops-signature'];

  try {
    const event = PayLoops.webhooks.verify({
      payload: req.body,
      signature,
      secret: process.env.PAYLOOPS_WEBHOOK_SECRET
    });

    switch (event.type) {
      case 'payment.captured':
        // Fulfill the order
        await fulfillOrder(event.data.orderId);
        break;

      case 'payment.failed':
        // Notify customer
        await notifyPaymentFailed(event.data.orderId);
        break;

      case 'refund.processed':
        // Update your records
        await recordRefund(event.data.refundId);
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook verification failed:', err);
    res.status(400).send('Invalid signature');
  }
});
```

## Error Handling

```typescript
import {
  PayLoops,
  PayLoopsError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError
} from '@payloops/sdk';

try {
  const order = await payloops.orders.create({ ... });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid or expired API key
    console.error('Check your API key');
  } else if (error instanceof ValidationError) {
    // Invalid request parameters
    console.error('Validation failed:', error.message);
  } else if (error instanceof NotFoundError) {
    // Resource doesn't exist
    console.error('Order not found');
  } else if (error instanceof RateLimitError) {
    // Too many requests
    console.error('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof PayLoopsError) {
    // Other API error
    console.error(error.code, error.message, error.status);
  }
}
```

## Configuration

```typescript
const payloops = new PayLoops({
  apiKey: 'sk_live_...',
  baseUrl: 'https://api.payloops.com',  // Default
  timeout: 30000,                        // 30 seconds
});
```

## TypeScript Support

Full type definitions included:

```typescript
import type {
  Order,
  CreateOrderParams,
  PayOrderParams,
  PayOrderResult,
  RefundParams,
  CheckoutSession,
  WebhookEvent
} from '@payloops/sdk';

// Types are inferred automatically
const order: Order = await payloops.orders.get('ord_xxx');
```

## Testing

Use test mode API keys (`sk_test_...`) for development:

```typescript
// Test mode
const payloops = new PayLoops('sk_test_...');

// Use test card numbers
// Stripe: 4242424242424242
// Razorpay: 4111111111111111
```

## Related Repositories

- [backend](https://github.com/payloops/backend) - API that this SDK connects to
- [loop](https://github.com/payloops/loop) - Platform overview and documentation

## License

MIT - see [LICENSE](LICENSE) for details.
