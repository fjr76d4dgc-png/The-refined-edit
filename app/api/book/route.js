import { db } from '@/lib/supabase';
import { stripe, siteUrl } from '@/lib/stripe';
import { getSlotsForDate, releaseExpiredHolds } from '@/lib/bookings';
import { sendOwnerNotification, safely } from '@/lib/email';
import { priceSelection, PATCH_TEST, DEPOSIT, EVENING_SURCHARGE, CHECKOUT_HOLD_MINUTES } from '@/lib/config';
import { isValidDate, isValidTime, prettyDate, prettyTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const isPatch = body.kind === 'patch_test';
  const date = body.date;
  const time = body.time;
  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const allergies = clean(body.allergies);
  const notes = clean(body.notes);

  if (!isValidDate(date) || !isValidTime(time)) return Response.json({ error: 'Please choose a date and time.' }, { status: 400 });
  if (!name || !phone) return Response.json({ error: 'Please add your name and phone number.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  if (!body.agreed) return Response.json({ error: 'Please agree to the booking policy.' }, { status: 400 });

  let services, summary, duration, price;
  if (isPatch) {
    services = [PATCH_TEST.id];
    summary = PATCH_TEST.name;
    duration = PATCH_TEST.duration;
    price = 0;
  } else {
    const sel = priceSelection(Array.isArray(body.services) ? body.services : []);
    if (sel.error) return Response.json({ error: sel.error }, { status: 400 });
    services = sel.items.map((s) => s.id);
    summary = sel.summary;
    duration = sel.duration;
    price = sel.price;
  }

  try {
    await releaseExpiredHolds();

    // Re-check on the server that the time is genuinely still free.
    const slots = await getSlotsForDate(date, duration);
    const slot = slots.find((s) => s.time === time);
    if (!slot) return Response.json({ error: 'Sorry — that time has just been taken. Please pick another.' }, { status: 409 });

    const surcharge = !isPatch && slot.evening ? EVENING_SURCHARGE : 0;
    const holdUntil = new Date(Date.now() + (CHECKOUT_HOLD_MINUTES + 1) * 60 * 1000);

    const { data: booking, error } = await db()
      .from('bookings')
      .insert({
        kind: isPatch ? 'patch_test' : 'treatment',
        services,
        service_summary: summary,
        date,
        start_time: slot.time,
        end_time: slot.end,
        client_name: name,
        client_email: email,
        client_phone: phone,
        allergies: allergies || null,
        notes: notes || null,
        treatment_price: price,
        evening_surcharge: surcharge,
        total_price: price + surcharge,
        deposit: isPatch ? 0 : DEPOSIT,
        status: isPatch ? 'confirmed' : 'pending',
        deposit_status: isPatch ? 'not_required' : 'unpaid',
        expires_at: isPatch ? null : holdUntil.toISOString(),
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23P01') return Response.json({ error: 'Sorry — that time has just been taken. Please pick another.' }, { status: 409 });
      throw error;
    }

    // Free patch test: confirmed straight away, no payment.
    if (isPatch) {
      await safely(sendOwnerNotification, booking);
      return Response.json({ url: `/book/confirmed?id=${booking.id}` });
    }

    // Treatment: send the client to Stripe to pay the deposit.
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: DEPOSIT * 100,
            product_data: {
              name: `Booking deposit — ${summary}`,
              description: `${prettyDate(date)} at ${prettyTime(slot.time)}. Remaining £${price + surcharge - DEPOSIT} payable on the day.`,
            },
          },
        },
      ],
      metadata: { booking_id: booking.id },
      payment_intent_data: { metadata: { booking_id: booking.id }, description: `The Refined Edit deposit — ${name}` },
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_HOLD_MINUTES * 60,
      success_url: `${siteUrl()}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/book/cancelled?id=${booking.id}`,
    });

    await db().from('bookings').update({ stripe_session_id: session.id }).eq('id', booking.id);
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('Booking failed', e);
    return Response.json({ error: 'Something went wrong creating your booking. Please try again.' }, { status: 500 });
  }
}
