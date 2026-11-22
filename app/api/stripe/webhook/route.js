import { stripe } from '@/lib/stripe';
import { db } from '@/lib/supabase';
import { confirmFromSession } from '@/lib/bookings';

export const dynamic = 'force-dynamic';

// Stripe calls this URL when a deposit is paid or a checkout expires.
export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Webhook signature check failed', e.message);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    const session = event.data.object;
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await confirmFromSession(session);
    } else if (event.type === 'checkout.session.expired') {
      const id = session?.metadata?.booking_id;
      if (id) await db().from('bookings').update({ status: 'expired' }).eq('id', id).eq('status', 'pending');
    }
  } catch (e) {
    console.error('Webhook handling failed', e);
    return new Response('Error', { status: 500 });
  }

  return Response.json({ received: true });
}
