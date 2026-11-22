import { db } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { isAdmin, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/bookings/:id/refund — refunds the Stripe deposit and cancels the booking
export async function POST(request, { params }) {
  if (!isAdmin()) return unauthorized();

  const { data: booking } = await db().from('bookings').select('*').eq('id', params.id).single();
  if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
  if (booking.deposit_status !== 'paid') return Response.json({ error: 'No paid deposit to refund' }, { status: 400 });

  try {
    if (booking.stripe_payment_intent) {
      await stripe().refunds.create({ payment_intent: booking.stripe_payment_intent });
    } else if (booking.source !== 'manual') {
      return Response.json({ error: 'No Stripe payment found for this booking' }, { status: 400 });
    }
    const { data } = await db()
      .from('bookings')
      .update({ deposit_status: 'refunded', refunded_at: new Date().toISOString(), status: 'cancelled' })
      .eq('id', booking.id)
      .select()
      .single();
    return Response.json({ booking: data });
  } catch (e) {
    return Response.json({ error: e.message || 'Refund failed' }, { status: 500 });
  }
}
