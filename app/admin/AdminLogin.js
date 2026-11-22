'use client';
import { useState } from 'react';

export default function AdminLogin({ setupError }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(setupError || '');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (res.ok) window.location.reload();
    else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Could not log in');
      setBusy(false);
    }
  }

  return (
    <form className="login-box" onSubmit={submit}>
      <img src="/brand/monogram.png" alt="The Refined Edit" />
      <div className="eyebrow">Bookings dashboard</div>
      <input type="password" placeholder="Password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginTop: 22 }} />
      {error && <p className="error">{error}</p>}
      <button className="btn" style={{ width: '100%', marginTop: 14 }} disabled={busy || !password}>{busy ? 'Checking…' : 'Log in'}</button>
    </form>
  );
}
