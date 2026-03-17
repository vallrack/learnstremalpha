import Stripe from 'stripe';

/**
 * Stripe SDK initialization.
 * We use a placeholder key if the environment variable is missing to prevent 
 * module evaluation errors during build or initial startup.
 */
const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder_key_missing';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is missing from environment variables. Stripe functionality will not work until configured.');
}

export const stripe = new Stripe(apiKey, {
  apiVersion: '2025-01-27', // Use the latest API version
  typescript: true,
});
