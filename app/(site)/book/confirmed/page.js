import Link from 'next/link';
import { db } from '@/lib/supabase';
import { prettyDate, prettyTime } from '@/lib/time';
import { BUSINESS } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Patch test booked' };

export default async function Confirmed({ searchParams }) {
  const id = searchParams?.id;
  let b = null;
  if (id && /^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await db().from('bookings').select('*').eq('id', id).eq('kind', 'patch_test').maybeSingle();
    b = data;
  }
  if (!b) {
    return (
      <section className="section"><div className="wrap confirm-box">
        <h1 className="section-title">Booking not found</h1><hr className="rule" />
        <Link href="/book" className="btn">Book now</Link>
      </div></section>
    );
  }
  return (
    <section className="section">
      <div className="wrap confirm-box">
        <span className="eyebrow">Free patch test</span>
        <h1 className="section-title" style={{ marginTop: 12 }}>You’re booked in</h1>
        <hr className="rule" />
        <div className="panel">
          <dl>
            <dt>Appointment</dt><dd>Patch test (approx. 15 mins)</dd>
            <dt>When</dt><dd>{prettyDate(b.date)} at {prettyTime(b.start_time)}</dd>
            <dt>Where</dt><dd>{BUSINESS.address}<br /><span className="muted" style={{ fontSize: '.9rem' }}>Home-based studio</span></dd>
            <dt>Cost</dt><dd>Free</dd>
          </dl>
        </div>
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="eyebrow">Before you arrive</div>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            {BUSINESS.arrivalNotes.map((n) => <li key={n} style={{ marginBottom: 6 }}>{n}</li>)}
          </ul>
        </div>
        <p className="muted" style={{ marginTop: 22 }}>
          Your treatment needs to be at least 48 hours after your patch test. You can book it now — we’ll only show dates from then onwards.
        </p>
        <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href={`/book?after=${b.date}`} className="btn">Book my treatment</Link>
          <Link href="/" className="btn ghost">I’ll book later</Link>
        </div>
        <p className="muted" style={{ marginTop: 22, fontSize: '.9rem' }}>
          Can’t make it? Please let us know on <a href={BUSINESS.instagramUrl}>@{BUSINESS.instagram}</a> so the slot can go to someone else.
        </p>
      </div>
    </section>
  );
}
