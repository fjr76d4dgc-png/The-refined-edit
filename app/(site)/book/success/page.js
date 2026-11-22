import Link from 'next/link';
import { stripe } from '@/lib/stripe';
import { confirmFromSession } from '@/lib/bookings';
import { prettyDate, prettyTime } from '@/lib/time';
import { BUSINESS } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Booking confirmed' };

export default async function Success({ searchParams }) {
  let result = { ok: false };
  try {
    if (searchParams?.session_id) {
      const session = await stripe().checkout.sessions.retrieve(searchParams.session_id);
      result = await confirmFromSession(session);
    }
  } catch (e) {
    console.error(e);
  }

  const b = result.booking;
  return (
    <section className="section">
      <div className="wrap confirm-box">
        {result.ok && b ? (
          <>
            <span className="eyebrow">Deposit received</span>
            <h1 className="section-title" style={{ marginTop: 12 }}>You’re booked in</h1>
            <hr className="rule" />
            <p className="muted">A receipt for your £{b.deposit} deposit has been emailed to {b.client_email}. I can’t wait to see you ✨</p>
            <div className="panel">
              <dl>
                <dt>Treatment</dt><dd>{b.service_summary}</dd>
                <dt>When</dt><dd>{prettyDate(b.date)} at {prettyTime(b.start_time)}</dd>
                <dt>Where</dt><dd>{BUSINESS.address}<br /><span className="muted" style={{ fontSize: '.9rem' }}>Home-based studio</span></dd>
                <dt>Paid today</dt><dd>£{b.deposit} deposit</dd>
                <dt>Pay on the day</dt><dd>£{b.total_price - b.deposit}{b.evening_surcharge ? ` (includes £${b.evening_surcharge} evening)` : ''}</dd>
              </dl>
            </div>
            <div className="panel" style={{ marginTop: 18 }}>
              <div className="eyebrow">Before you arrive</div>
              <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                {BUSINESS.arrivalNotes.map((n) => <li key={n} style={{ marginBottom: 6 }}>{n}</li>)}
              </ul>
            </div>
            <p className="muted" style={{ marginTop: 22, fontSize: '.9rem' }}>
              Need to change something? Please message <a href={BUSINESS.instagramUrl}>@{BUSINESS.instagram}</a> at least 48 hours before your appointment.
            </p>
          </>
        ) : result.clash ? (
          <>
            <h1 className="section-title">Payment received</h1>
            <hr className="rule" />
            <p>Your deposit went through, but that time was taken while you were paying. Please message <a href={BUSINESS.instagramUrl}>@{BUSINESS.instagram}</a> and we’ll rebook you or refund you straight away.</p>
          </>
        ) : (
          <>
            <h1 className="section-title">Almost there</h1>
            <hr className="rule" />
            <p>We couldn’t confirm your payment yet. If you were charged, your booking will confirm automatically within a few minutes — otherwise please <Link href="/book">try booking again</Link>.</p>
          </>
        )}
        <div style={{ marginTop: 30 }}><Link href="/" className="btn ghost">Back to home</Link></div>
      </div>
    </section>
  );
}
