import { db } from '@/lib/supabase';
import { bookingWindow } from '@/lib/bookings';

export const dynamic = 'force-dynamic';

// GET /api/days?month=2026-12  →  { dates: ['2026-12-01', ...] } that have working hours set
export async function GET(request) {
  const month = new URL(request.url).searchParams.get('month') || '';
  if (!/^\d{4}-\d{2}$/.test(month)) return Response.json({ error: 'Bad month' }, { status: 400 });

  const { today, lastDay } = bookingWindow();
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const from = first < today ? today : first;
  const to = last > lastDay ? lastDay : last;
  if (from > to) return Response.json({ dates: [], today, lastDay });

  const { data, error } = await db().from('availability').select('date').gte('date', from).lte('date', to);
  if (error) return Response.json({ error: 'Could not load dates' }, { status: 500 });

  const dates = [...new Set((data || []).map((r) => r.date))].sort();
  return Response.json({ dates, today, lastDay });
}
