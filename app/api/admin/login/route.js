import { checkPassword, createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password || '')) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: 'Wrong password' }, { status: 401 });
  }
  createSession();
  return Response.json({ ok: true });
}
