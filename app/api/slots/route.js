import { getSlotsForDate } from '@/lib/bookings';
import { priceSelection, PATCH_TEST } from '@/lib/config';
import { isValidDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

// GET /api/slots?date=2026-12-01&services=brow-lamination,bespoke-brow-tint
// GET /api/slots?date=2026-12-01&patch=1
export async function GET(request) {
  const p = new URL(request.url).searchParams;
  const date = p.get('date');
  if (!isValidDate(date)) return Response.json({ error: 'Bad date' }, { status: 400 });

  let duration;
  if (p.get('patch') === '1') {
    duration = PATCH_TEST.duration;
  } else {
    const sel = priceSelection((p.get('services') || '').split(',').filter(Boolean));
    if (sel.error) return Response.json({ error: sel.error }, { status: 400 });
    duration = sel.duration;
  }

  try {
    const slots = await getSlotsForDate(date, duration);
    return Response.json({ slots });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Could not load times' }, { status: 500 });
  }
}
