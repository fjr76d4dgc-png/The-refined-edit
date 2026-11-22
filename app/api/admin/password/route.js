import { isAdmin, unauthorized, checkPassword, savePassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// POST /api/admin/password  { current, next }
export async function POST(request) {
  if (!isAdmin()) return unauthorized();
  const { current, next } = await request.json().catch(() => ({}));
  const fresh = String(next || '').trim();
  if (fresh.length < 6) return Response.json({ error: 'Choose a password with at least 6 characters.' }, { status: 400 });
  if (!(await checkPassword(current || ''))) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: 'Your current password is wrong.' }, { status: 401 });
  }
  try {
    await savePassword(fresh);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Could not save the new password.' }, { status: 500 });
  }
}
