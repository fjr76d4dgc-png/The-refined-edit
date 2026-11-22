import { db } from '@/lib/supabase';
import { isAdmin, unauthorized } from '@/lib/auth';
import { addDays, isValidDate, isValidTime, toMin } from '@/lib/time';

export const dynamic = 'force-dynamic';

// GET /api/admin/availability?start=2026-11-23  →  7 days of hours + booking counts
export async function GET(request) {
  if (!isAdmin()) return unauthorized();
  const start = new URL(request.url).searchParams.get('start');
  if (!isValidDate(start)) return Response.json({ error: 'Bad start date' }, { status: 400 });
  const end = addDays(start, 6);

  const [{ data: windows, error }, { data: bookings }] = await Promise.all([
    db().from('availability').select('date,start_time,end_time').gte('date', start).lte('date', end).order('start_time'),
    db().from('bookings').select('date,start_time,end_time,client_name,service_summary').gte('date', start).lte('date', end).eq('status', 'confirmed').order('start_time'),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const days = {};
  for (let i = 0; i < 7; i++) days[addDays(start, i)] = { windows: [], bookings: [] };
  for (const w of windows || []) days[w.date]?.windows.push({ start: w.start_time.slice(0, 5), end: w.end_time.slice(0, 5) });
  for (const b of bookings || []) days[b.date]?.bookings.push({ start: b.start_time.slice(0, 5), end: b.end_time.slice(0, 5), name: b.client_name, summary: b.service_summary });
  return Response.json({ days });
}

// PUT /api/admin/availability  { start, days: { '2026-11-23': [{start:'09:00', end:'17:00'}], ... } }
export async function PUT(request) {
  if (!isAdmin()) return unauthorized();
  const { start, days } = await request.json().catch(() => ({}));
  if (!isValidDate(start) || !days || typeof days !== 'object') return Response.json({ error: 'Bad request' }, { status: 400 });
  const end = addDays(start, 6);

  const rows = [];
  for (const [date, windows] of Object.entries(days)) {
    if (!isValidDate(date) || date < start || date > end) continue;
    for (const w of windows || []) {
      if (!isValidTime(w.start) || !isValidTime(w.end) || toMin(w.end) <= toMin(w.start)) {
        return Response.json({ error: `Check the hours on ${date} — finish must be after start` }, { status: 400 });
      }
      rows.push({ date, start_time: w.start, end_time: w.end });
    }
  }

  const del = await db().from('availability').delete().gte('date', start).lte('date', end);
  if (del.error) return Response.json({ error: del.error.message }, { status: 500 });
  if (rows.length) {
    const ins = await db().from('availability').insert(rows);
    if (ins.error) return Response.json({ error: ins.error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
