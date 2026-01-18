/**
 * Test helpers for SDK functional tests
 * These helpers interact with the real backend API
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface TestMerchant {
  id: string;
  name: string;
  email: string;
  token: string;
  apiKey: string;
  webhookSecret?: string;
}

/**
 * Generate unique test user credentials
 */
export function generateTestCredentials() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return {
    name: `Test Merchant ${timestamp}`,
    email: `test${timestamp}${random}@example.com`,
    password: 'TestPassword123!',
  };
}

/**
 * Register a new merchant and get JWT token
 */
export async function registerMerchant(): Promise<{ id: string; name: string; email: string; token: string }> {
  const credentials = generateTestCredentials();

  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to register merchant: ${error.message}`);
  }

  const data = await response.json();
  return {
    id: data.merchant.id,
    name: data.merchant.name,
    email: data.merchant.email,
    token: data.token,
  };
}

/**
 * Create an API key for a merchant
 */
export async function createApiKey(token: string, name: string = 'Test API Key'): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/api-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create API key: ${error.message}`);
  }

  const data = await response.json();
  return data.secret;
}

/**
 * Get merchant's webhook secret
 */
export async function getWebhookSecret(token: string): Promise<string> {
  // The webhook secret is stored in the merchant record but not exposed via API
  // For testing, we'll need to either:
  // 1. Add an endpoint to expose it
  // 2. Query the database directly
  // For now, we'll use a fixed test secret
  return 'whsec_test_secret_for_functional_tests';
}

/**
 * Setup a complete test merchant with API key
 */
export async function setupTestMerchant(): Promise<TestMerchant> {
  const merchant = await registerMerchant();
  const apiKey = await createApiKey(merchant.token);

  return {
    ...merchant,
    apiKey,
  };
}

/**
 * Configure a processor for the merchant
 */
export async function configureProcessor(
  token: string,
  processor: 'stripe' | 'razorpay',
  credentials: Record<string, string> = {}
): Promise<void> {
  const defaultCredentials =
    processor === 'stripe'
      ? { secretKey: 'sk_test_fake', publishableKey: 'pk_test_fake' }
      : { keyId: 'rzp_test_fake', keySecret: 'fake_secret' };

  const response = await fetch(`${API_BASE_URL}/api/processors/${processor}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      credentials: { ...defaultCredentials, ...credentials },
      enabled: true,
      priority: 1,
      testMode: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to configure processor: ${error.message}`);
  }
}

/**
 * Clean up test data (optional - for cleanup after tests)
 */
export async function cleanupMerchant(token: string): Promise<void> {
  // Delete API keys, processor configs, etc.
  // This is optional since we create unique merchants for each test
}
