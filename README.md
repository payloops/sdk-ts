# @payloops/sdk

Official TypeScript/JavaScript SDK for Loop Payment Platform.

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
import Loop from '@payloops/sdk';

const loop = new Loop('sk_test_your_api_key');

// Create a payment order
const order = await loop.orders.create({
  amount: 1999, // $19.99 in cents
  currency: 'USD',
  customerEmail: 'customer@example.com',
  metadata: {
    productId: 'prod_123'
  }
});

// Process the payment
const result = await loop.orders.pay(order.id, {
  paymentMethod: {
    type: 'card',
    token: 'pm_card_visa' // Payment method token from your frontend
  }
});

console.log(result.status); // 'captured', 'requires_action', etc.
```

## API Reference

### Orders

```typescript
// Create an order
const order = await loop.orders.create({
  amount: 1999,
  currency: 'USD',
  externalId: 'order_123', // Your internal order ID
  customerEmail: 'customer@example.com',
  description: 'Premium subscription',
  metadata: { key: 'value' },
  returnUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel'
});

// Get order details
const order = await loop.orders.get('ord_xxx');

// Process payment
const result = await loop.orders.pay('ord_xxx', {
  processor: 'stripe', // Optional: specify processor
  paymentMethod: {
    type: 'card',
    token: 'pm_xxx'
  }
});

// Get transactions
const transactions = await loop.orders.getTransactions('ord_xxx');

// Refund an order
const refund = await loop.orders.refund('ord_xxx', {
  amount: 500, // Partial refund of $5.00
  reason: 'Customer request'
});
```

### Checkout Sessions

Create hosted checkout pages for your customers:

```typescript
const session = await loop.checkout.createSession({
  amount: 2999,
  currency: 'USD',
  successUrl: 'https://yoursite.com/success?session_id={SESSION_ID}',
  cancelUrl: 'https://yoursite.com/cancel',
  customerEmail: 'customer@example.com',
  lineItems: [
    { name: 'Pro Plan', amount: 2999, quantity: 1 }
  ]
});

// Redirect customer to session.url
```

### Webhooks

Verify webhook signatures in your server:

```typescript
import { Loop } from '@payloops/sdk';

// Express example
app.post('/webhooks/loop', (req, res) => {
  const signature = req.headers['x-loop-signature'];

  try {
    const event = Loop.webhooks.verify({
      payload: req.body,
      signature,
      secret: process.env.LOOP_WEBHOOK_SECRET
    });

    switch (event.eventType) {
      case 'payment.captured':
        // Handle successful payment
        break;
      case 'payment.failed':
        // Handle failed payment
        break;
      case 'refund.processed':
        // Handle refund
        break;
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send('Invalid signature');
  }
});
```

## Error Handling

```typescript
import {
  Loop,
  LoopError,
  AuthenticationError,
  ValidationError
} from '@payloops/sdk';

try {
  const order = await loop.orders.create({ amount: 1000 });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid API key
  } else if (error instanceof ValidationError) {
    // Invalid parameters
  } else if (error instanceof LoopError) {
    console.error(error.code, error.message, error.status);
  }
}
```

## Configuration

```typescript
const loop = new Loop({
  apiKey: 'sk_test_xxx',
  baseUrl: 'https://api.loop.dev', // Optional: custom API URL
  timeout: 30000 // Optional: request timeout in ms
});
```

## TypeScript

Full TypeScript support with exported types:

```typescript
import type {
  Order,
  CreateOrderParams,
  PayOrderResult,
  WebhookEvent
} from '@payloops/sdk';
```

## License

MIT
