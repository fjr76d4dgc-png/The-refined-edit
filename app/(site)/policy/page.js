import Link from 'next/link';
import { POLICY_POINTS } from '@/components/PolicyPoints';

export const metadata = { title: 'Booking Policy' };


export default function Policy() {
  return (
    <section className="section">
      <div className="wrap policy">
        <div className="center">
          <span className="eyebrow">Please read before booking</span>
          <h1 className="section-title" style={{ marginTop: 12 }}>Policy</h1>
          <hr className="rule" />
          <p className="muted">To keep appointments running smoothly and ensure the best experience for everyone.</p>
        </div>
        <ol>
          {POLICY_POINTS.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
        <p className="center" style={{ marginTop: 34, fontFamily: 'var(--display)', fontSize: '1.25rem' }}>
          By booking, you agree to these policies. Thank you for supporting my small business ✨
        </p>
        <div className="center" style={{ marginTop: 26 }}>
          <Link href="/book" className="btn">Book an appointment</Link>
        </div>
      </div>
    </section>
  );
}
