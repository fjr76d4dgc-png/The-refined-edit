import { db } from '@/lib/supabase';
import { isAdmin, unauthorized } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED = ['confirmed', 'completed', 'cancelled', 'no_show'];

// PATCH /api/admin/bookings/:id  { status?, admin_note? }
export async function PATCH(request, { params }) {
  if (!isAdmin()) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.status !== undefined) {
    if (!ALLOWED.includes(body.status)) return Response.json({ error: 'Bad status' }, { status: 400 });
    update.status = body.status;
  }
  if (body.admin_note !== undefined) update.admin_note = String(body.admin_note).slice(0, 1000) || null;

  const { data, error } = await db().from('bookings').update(update).eq('id', params.id).select().single();
  if (error) {
    if (error.code === '23P01') return Response.json({ error: 'Can’t restore — that time is now taken by another booking' }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ booking: data });
}
