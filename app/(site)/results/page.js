import Link from 'next/link';
import Gallery from '@/components/Gallery';
import { RESULTS } from '@/lib/results';
import { BUSINESS } from '@/lib/config';

export const metadata = { title: 'Results' };

export default function Results() {
  return (
    <section className="section">
      <div className="wrap center">
        <span className="eyebrow">Before &amp; after</span>
        <h1 className="section-title" style={{ marginTop: 12 }}>Results</h1>
        <hr className="rule" />
        <p className="muted" style={{ maxWidth: 520, margin: '0 auto' }}>
          Real clients, real lashes and brows. Tap any photo to see it larger.
        </p>
        <Gallery images={RESULTS} />
        <div style={{ marginTop: 44, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/book" className="btn">Book yours</Link>
          <a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer" className="btn ghost">More on Instagram</a>
        </div>
      </div>
    </section>
  );
}
