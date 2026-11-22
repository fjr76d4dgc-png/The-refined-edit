import Link from 'next/link';
import { BUSINESS } from '@/lib/config';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <img src="/brand/monogram.png" alt="The Refined Edit" />
            <p style={{ marginTop: 18, maxWidth: 320, color: 'rgba(239,232,226,.75)', fontSize: '.92rem' }}>
              Lash lifts, brow laminations and bespoke brow treatments in {BUSINESS.area}. ABT insured &amp; accredited.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <ul>
              <li><Link href="/treatments">Treatments &amp; prices</Link></li>
              <li><Link href="/results">Results</Link></li>
              <li><Link href="/policy">Booking policy</Link></li>
              <li><Link href="/book">Book an appointment</Link></li>
            </ul>
          </div>
          <div>
            <h4>Find us</h4>
            <ul>
              <li>{BUSINESS.area}</li>
              <li><a href={BUSINESS.instagramUrl} target="_blank" rel="noreferrer">@{BUSINESS.instagram}</a></li>
              <li style={{ color: 'rgba(239,232,226,.6)' }}>By appointment only</li>
            </ul>
          </div>
        </div>
        <div className="small">
          <span>© {new Date().getFullYear()} {BUSINESS.name}</span>
          <span>Thank you for supporting my small business ✨</span>
        </div>
      </div>
    </footer>
  );
}
