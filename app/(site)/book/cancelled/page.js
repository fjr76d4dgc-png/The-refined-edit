import Link from 'next/link';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Booking not completed' };

export default async function Cancelled({ searchParams }) {
  const id = searchParams?.id;
  // Release the held slot straight away so others can book it.
  if (id && /^[0-9a-f-]{36}$/i.test(id)) {
    await db().from('bookings').update({ status: 'expired' }).eq('id', id).eq('status', 'pending').eq('deposit_status', 'unpaid');
  }
  return (
    <section className="section">
      <div className="wrap confirm-box">
        <h1 className="section-title">Booking not completed</h1>
        <hr className="rule" />
        <p className="muted">No payment was taken and your time hasn’t been reserved. You’re welcome to try again whenever you’re ready.</p>
        <div style={{ marginTop: 26 }}><Link href="/book" className="btn">Book again</Link></div>
      </div>
    </section>
  );
}
