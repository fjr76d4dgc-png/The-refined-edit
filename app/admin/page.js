import { isAdmin } from '@/lib/auth';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminPage() {
  let ok = false;
  let setupError = '';
  try {
    ok = isAdmin();
  } catch (e) {
    setupError = e.message;
  }
  return <div className="admin">{ok ? <AdminDashboard /> : <AdminLogin setupError={setupError} />}</div>;
}
