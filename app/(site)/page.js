import Link from 'next/link';
import Gallery from '@/components/Gallery';
import { RESULTS } from '@/lib/results';
import { DEPOSIT, EVENING_SURCHARGE } from '@/lib/config';

const FEATURED = [
  { title: 'Korean Lash Lift', from: 'From £40', text: 'Our signature lift — soft, glossy, naturally elevated lashes with long-lasting definition.' },
  { title: 'Brow Lamination', from: '£30', text: 'Fuller, smoother, perfectly styled brows, set into the shape that suits your face.' },
  { title: 'Brow Wax & Tint', from: 'From £20', text: 'Precise shaping and a custom-blended tint for naturally defined brows.' },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <img className="hero-logo" src="/brand/logo-full.png" alt="The Refined Edit" />
          <h1>Soft, glossy, naturally elevated.</h1>
          <p>Korean &amp; LVL lash lifts, brow laminations and bespoke brow treatments in Birmingham, B19 — designed to enhance what’s already yours.</p>
          <div className="actions">
            <Link href="/book" className="btn">Book an appointment</Link>
            <Link href="/treatments" className="btn ghost">View treatments</Link>
          </div>
        </div>
      </section>

      <div className="trust">
        <div className="wrap">
          <ul>
            <li>ABT insured &amp; accredited</li>
            <li>Korean &amp; LVL lifts</li>
            <li>Bespoke brow tints</li>
            <li>Free patch tests</li>
          </ul>
        </div>
      </div>

      <section className="section">
        <div className="wrap center">
          <span className="eyebrow">The Edit</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>Treatments</h2>
          <hr className="rule" />
          <div className="cards">
            {FEATURED.map((f) => (
              <div className="card" key={f.title}>
                <span className="from">{f.from}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40 }}>
            <Link href="/treatments" className="btn ghost">Full menu &amp; prices</Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--cream-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap center">
          <span className="eyebrow">Real clients</span>
          <h2 className="section-title" style={{ marginTop: 12 }}>Results</h2>
          <hr className="rule" />
          <Gallery images={RESULTS.slice(0, 4)} teaser />
          <div style={{ marginTop: 40 }}>
            <Link href="/results" className="btn ghost">See more results</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <img src="/results/result-6.jpg" alt="Lifted lashes and laminated brows" />
          <div>
            <span className="eyebrow">Booking</span>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,2.8rem)', marginTop: 12 }}>Simple, secure online booking</h2>
            <hr className="rule left" />
            <p className="muted">Choose your treatment, pick a time that suits you and secure it with a £{DEPOSIT} deposit — the rest is paid on the day.</p>
            <ul style={{ paddingLeft: 18, color: 'var(--ink-2)' }}>
              <li>Free patch test available before your treatment (recommended)</li>
              <li>Evening appointments from 5pm (+£{EVENING_SURCHARGE})</li>
              <li>48 hours’ notice needed to cancel or reschedule</li>
            </ul>
            <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              <Link href="/book" className="btn">Book now</Link>
              <Link href="/policy" className="btn ghost">Read the policy</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
