import BookingFlow from './BookingFlow';
import { SERVICES } from '@/lib/config';
import { isValidDate } from '@/lib/time';

export const metadata = { title: 'Book an appointment' };

export default function BookPage({ searchParams }) {
  const t = searchParams?.t;
  const initial = t && SERVICES.some((s) => s.id === t) ? [t] : [];
  const after = isValidDate(searchParams?.after) ? searchParams.after : null;
  return (
    <section className="section" style={{ paddingTop: 48 }}>
      <div className="wrap">
        <div className="center" style={{ marginBottom: 38 }}>
          <span className="eyebrow">The Refined Edit</span>
          <h1 className="section-title" style={{ marginTop: 12 }}>Book</h1>
          <hr className="rule" />
        </div>
        <BookingFlow initialServices={initial} startWithPatch={searchParams?.patch === '1'} afterPatchDate={after} />
      </div>
    </section>
  );
}
