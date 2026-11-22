import { db } from './supabase.js';
import { computeSlots } from './slots.js';
import { londonNow, addDays, toMin } from './time.js';
import { BUFFER_MINUTES, SLOT_STEP_MINUTES, MIN_NOTICE_HOURS, MAX_DAYS_AHEAD, EVENING_FROM } from './config.js';

// Unpaid bookings whose checkout hold has run out stop blocking the slot.
export async function releaseExpiredHolds() {
  await db()
    .from('bookings')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());
}

export function bookingWindow() {
  const now = londonNow();
  return { today: now.date, nowMinutes: now.minutes, lastDay: addDays(now.date, MAX_DAYS_AHEAD) };
}

export async function getSlotsForDate(date, duration) {
  const { today, nowMinutes, lastDay } = bookingWindow();
  if (date < today || date > lastDay) return [];

  const [{ data: windows, error: wErr }, { data: taken, error: bErr }] = await Promise.all([
    db().from('availability').select('start_time,end_time').eq('date', date),
    db()
      .from('bookings')
      .select('start_time,end_time,status,expires_at')
      .eq('date', date)
      .in('status', ['pending', 'confirmed']),
  ]);
  if (wErr) throw wErr;
  if (bErr) throw bErr;

  const nowIso = new Date().toISOString();
  const blocking = (taken || []).filter((b) => b.status === 'confirmed' || (b.expires_at && b.expires_at > nowIso));

  return computeSlots({
    windows: windows || [],
    bookings: blocking,
    duration,
    step: SLOT_STEP_MINUTES,
    buffer: BUFFER_MINUTES,
    earliest: date === today ? nowMinutes + MIN_NOTICE_HOURS * 60 : 0,
    eveningFrom: toMin(EVENING_FROM),
  });
}

// Marks a booking paid + confirmed from a completed Stripe Checkout session.
// Safe to call more than once (webhook and success page both call it).
export async function confirmFromSession(session) {
  const bookingId = session?.metadata?.booking_id;
  if (!bookingId || session.payment_status !== 'paid') return { ok: false };

  const { data: booking } = await db().from('bookings').select('*').eq('id', bookingId).single();
  if (!booking) return { ok: false };
  if (booking.status === 'confirmed' || booking.deposit_status === 'paid') return { ok: true, booking };

  const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const { data, error } = await db()
    .from('bookings')
    .update({
      status: 'confirmed',
      deposit_status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_payment_intent: paymentIntent || null,
      expires_at: null,
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    // Very rare: the hold expired and someone else took the slot before payment finished.
    await db()
      .from('bookings')
      .update({ deposit_status: 'paid', paid_at: new Date().toISOString(), stripe_payment_intent: paymentIntent || null, admin_note: 'PAID BUT SLOT CLASHED — contact client to rebook or refund' })
      .eq('id', bookingId);
    return { ok: false, clash: true, booking };
  }
  return { ok: true, booking: data };
}
