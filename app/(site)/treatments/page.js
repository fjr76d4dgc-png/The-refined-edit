import Link from 'next/link';
import { SERVICES, GROUPS, PATCH_TEST, DEPOSIT, EVENING_SURCHARGE, DURATION_LABEL } from '@/lib/config';

export const metadata = { title: 'Treatments & Prices' };

export default function Treatments() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="center">
          <span className="eyebrow">The Refined Edit</span>
          <h1 className="section-title" style={{ marginTop: 12 }}>Treatment Menu</h1>
          <hr className="rule" />
        </div>

        <div className="menu">
          {GROUPS.map((g) => (
            <div className="menu-group" key={g.id}>
              <div className="divider">{g.name}</div>
              {SERVICES.filter((s) => s.group === g.id).map((s) => (
                <div className="menu-item" key={s.id}>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                  </div>
                  <div className="price">£{s.price}</div>
                  <div className="meta">
                    <span>{DURATION_LABEL}</span>
                    <Link href={`/book?t=${s.id}`}>Book →</Link>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="menu-group">
            <div className="divider">Before you book</div>
            <div className="menu-item">
              <div>
                <h3>{PATCH_TEST.name} <span className="badge" style={{ marginLeft: 8 }}>Recommended</span></h3>
                <p>{PATCH_TEST.description}</p>
              </div>
              <div className="price">Free</div>
              <div className="meta">
                <span>Subject to availability</span>
                <Link href="/book?patch=1">Book a patch test →</Link>
              </div>
            </div>
          </div>

          <div className="note-card">
            All treatments are secured with a <strong>£{DEPOSIT} deposit</strong>, with the remaining balance paid on the day.
            <br />Evening appointments from 5pm are <strong>+£{EVENING_SURCHARGE}</strong>.
            <div style={{ marginTop: 18 }}>
              <Link href="/book" className="btn">Book an appointment</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
