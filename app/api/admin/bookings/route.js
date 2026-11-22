import { db } from '@/lib/supabase';
import { isAdmin, unauthorized } from '@/lib/auth';
import { releaseExpiredHolds } from '@/lib/bookings';
import { priceSelection, PATCH_TEST, EVENING_SURCHARGE, EVENING_FROM } from '@/lib/config';
import { isValidDate, isValidTime, toMin, toHHMM } from '@/lib/time';

export const dynamic = 'force-dynamic';

// GET /api/admin/bookings?from=2026-11-01&to=2026-12-31
export async function GET(request) {
  if (!isAdmin()) return unauthorized();
  await releaseExpiredHolds();

  const p = new URL(request.url).searchParams;
  let q = db().from('bookings').select('*').order('date', { ascending: true }).order('start_time', { ascending: true });
  if (isValidDate(p.get('from'))) q = q.gte('date', p.get('from'));
  if (isValidDate(p.get('to'))) q = q.lte('date', p.get('to'));
  // Hide abandoned checkouts unless money was taken
  q = q.or('status.neq.expired,deposit_status.eq.paid');

  const { data, error } = await q.limit(1000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ bookings: data });
}

// POST /api/admin/bookings  — add a booking yourself (e.g. a client who DM'd you)
export async function POST(request) {
  if (!isAdmin()) return unauthorized();
  const b = await request.json().catch(() => ({}));

  if (!isValidDate(b.date) || !isValidTime(b.time)) return Response.json({ error: 'Choose a date and start time' }, { status: 400 });
  if (!b.name?.trim() || !b.phone?.trim()) return Response.json({ error: 'Name and phone are required' }, { status: 400 });

  const isPatch = b.kind === 'patch_test';
  let services, summary, duration, price;
  if (isPatch) {
    services = [PATCH_TEST.id]; summary = PATCH_TEST.name; duration = PATCH_TEST.duration; price = 0;
  } else {
    const sel = priceSelection(b.services || []);
    if (sel.error) return Response.json({ error: sel.error }, { status: 400 });
    services = sel.items.map((s) => s.id); summary = sel.summary; duration = sel.duration; price = sel.price;
  }

  const start = toMin(b.time);
  const end = start + duration;
  if (end >= 24 * 60) return Response.json({ error: 'That runs past midnight' }, { status: 400 });
  const surcharge = !isPatch && start >= toMin(EVENING_FROM) ? EVENING_SURCHARGE : 0;
  const depositPaid = !isPatch && Number(b.depositPaid) > 0 ? Math.round(Number(b.depositPaid)) : 0;

  await releaseExpiredHolds();
  const { data, error } = await db()
    .from('bookings')
    .insert({
      kind: isPatch ? 'patch_test' : 'treatment',
      services,
      service_summary: summary,
      date: b.date,
      start_time: b.time,
      end_time: toHHMM(end),
      client_name: b.name.trim(),
      client_email: b.email?.trim() || null,
      client_phone: b.phone.trim(),
      notes: b.notes?.trim() || null,
      treatment_price: price,
      evening_surcharge: surcharge,
      total_price: price + surcharge,
      deposit: depositPaid,
      status: 'confirmed',
      deposit_status: isPatch || depositPaid === 0 ? 'not_required' : 'paid',
      paid_at: depositPaid ? new Date().toISOString() : null,
      source: 'manual',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23P01') return Response.json({ error: 'That overlaps another booking' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ booking: data });
}
