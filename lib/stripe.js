import Stripe from 'stripe';

let client;
export function stripe() {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}
