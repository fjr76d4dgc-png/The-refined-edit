'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SERVICES, GROUPS, PATCH_TEST, REFUND_WINDOW_HOURS, DEPOSIT } from '@/lib/config';
import { londonNow, addDays, mondayOf, prettyDate, prettyTime, toMin } from '@/lib/time';

const STATUS_BADGE = {
  confirmed: ['Confirmed', 'green'],
  pending: ['Awaiting payment', 'soft'],
  completed: ['Completed', 'dark'],
  cancelled: ['Cancelled', 'red'],
  no_show: ['No-show', 'red'],
  expired: ['Expired', 'soft'],
};
const DEPOSIT_BADGE = {
  paid: ['Deposit paid', 'green'],
  refunded: ['Deposit refunded', 'soft'],
  unpaid: ['Deposit unpaid', 'red'],
  not_required: ['No deposit', 'soft'],
};

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) window.location.reload();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function hoursSince(iso) {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('bookings');
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  }
  return (
    <>
      <div className="admin-top">
        <div className="wrap">
          <img src="/brand/monogram.png" alt="The Refined Edit" />
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: '.8rem' }}>
            <a href="/" target="_blank" style={{ color: 'var(--cream)' }}>View site ↗</a>
            <button className="link-btn" style={{ color: 'var(--cream)' }} onClick={logout}>Log out</button>
          </div>
        </div>
      </div>
      <div className="wrap" style={{ paddingBottom: 80 }}>
        <div className="tabs">
          {[['bookings', 'Bookings'], ['availability', 'My availability'], ['add', '+ Add booking'], ['settings', 'Settings']].map(([id, label]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        {tab === 'bookings' && <Bookings />}
        {tab === 'availability' && <Availability />}
        {tab === 'add' && <AddBooking onDone={() => setTab('bookings')} />}
        {tab === 'settings' && <Settings />}
      </div>
    </>
  );
}

/* ───────────────────────── Bookings log ───────────────────────── */

function Bookings() {
  const today = useMemo(() => londonNow().date, []);
  const [range, setRange] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const params = useMemo(() => {
    if (range === 'upcoming') return `from=${today}`;
    if (range === 'today') return `from=${today}&to=${today}`;
    if (range === 'week') return `from=${mondayOf(today)}&to=${addDays(mondayOf(today), 6)}`;
    if (range === 'past') return `from=${addDays(today, -30)}&to=${addDays(today, -1)}`;
    return '';
  }, [range, today]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api(`/api/admin/bookings?${params}`);
      setList(range === 'past' ? d.bookings.reverse() : d.bookings);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [params, range]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(b, status) {
    setBusyId(b.id);
    try {
      const d = await api(`/api/admin/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setList((l) => l.map((x) => (x.id === b.id ? d.booking : x)));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  }

  async function refund(b) {
    const hrs = hoursSince(b.paid_at);
    const inWindow = hrs <= REFUND_WINDOW_HOURS;
    const msg = inWindow
      ? `Refund £${b.deposit} to ${b.client_name} and cancel this booking?`
      : `This deposit was paid ${Math.floor(hrs)} hours ago — outside your ${REFUND_WINDOW_HOURS}-hour refund window. Refund anyway and cancel the booking?`;
    if (!window.confirm(msg)) return;
    setBusyId(b.id);
    try {
      const d = await api(`/api/admin/bookings/${b.id}/refund`, { method: 'POST' });
      setList((l) => l.map((x) => (x.id === b.id ? d.booking : x)));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  }

  const q = search.trim().toLowerCase();
  const shown = list.filter((b) => !q || [b.client_name, b.client_phone, b.client_email].some((v) => v?.toLowerCase().includes(q)));
  const live = list.filter((b) => b.status === 'confirmed');
  const upcomingLive = live.filter((b) => b.date >= today);
  const stats = [
    ['Today', live.filter((b) => b.date === today).length],
    ['Upcoming', upcomingLive.length],
    ['Patch tests', upcomingLive.filter((b) => b.kind === 'patch_test').length],
    ['Due on the day', `£${upcomingLive.reduce((t, b) => t + Math.max(b.total_price - (b.deposit_status === 'paid' ? b.deposit : 0), 0), 0)}`],
  ];

  const byDate = shown.reduce((acc, b) => ((acc[b.date] ||= []).push(b), acc), {});

  return (
    <>
      {range !== 'past' && range !== 'all' && (
        <div className="stats">
          {stats.map(([label, v]) => <div className="stat" key={label}><b>{v}</b><span>{label}</span></div>)}
        </div>
      )}
      <div className="toolbar">
        {[['upcoming', 'Upcoming'], ['today', 'Today'], ['week', 'This week'], ['past', 'Past 30 days'], ['all', 'All']].map(([id, label]) => (
          <button key={id} className={`chip ${range === id ? 'on' : ''}`} onClick={() => setRange(id)}>{label}</button>
        ))}
        <input type="text" placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginLeft: 'auto', minWidth: 200 }} />
        <button className="chip" onClick={load} title="Refresh">↻</button>
      </div>

      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && shown.length === 0 && <p className="muted">No bookings here yet.</p>}

      {Object.entries(byDate).map(([date, items]) => (
        <div key={date}>
          <div className="day-head">
            {prettyDate(date)}
            <small>{date === today ? 'Today · ' : ''}{items.filter((b) => b.status === 'confirmed').length} booked</small>
          </div>
          {items.map((b) => (
            <BookingCard key={b.id} b={b} busy={busyId === b.id} onStatus={setStatus} onRefund={refund} />
          ))}
        </div>
      ))}
    </>
  );
}

function BookingCard({ b, busy, onStatus, onRefund }) {
  const [st, stTone] = STATUS_BADGE[b.status] || [b.status, 'soft'];
  const [dp, dpTone] = DEPOSIT_BADGE[b.deposit_status] || [b.deposit_status, 'soft'];
  const paidDeposit = b.deposit_status === 'paid' ? b.deposit : 0;
  const due = Math.max(b.total_price - paidDeposit, 0);
  const inactive = ['cancelled', 'no_show', 'expired'].includes(b.status);
  const phoneDigits = (b.client_phone || '').replace(/[^\d+]/g, '');
  const waNumber = phoneDigits.startsWith('0') ? `44${phoneDigits.slice(1)}` : phoneDigits.replace('+', '');
  const refundable = b.deposit_status === 'paid' && b.paid_at && hoursSince(b.paid_at) <= REFUND_WINDOW_HOURS;

  return (
    <div className={`bk ${inactive ? 'dim' : ''}`}>
      <div className="t">{prettyTime(b.start_time)}<small>until {prettyTime(b.end_time)}</small></div>
      <div>
        <div className="who">{b.client_name}</div>
        <div className="svcs">{b.service_summary}</div>
        <div className="contact">
          <a href={`tel:${phoneDigits}`}>{b.client_phone}</a>
          {waNumber && <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          {b.client_email && <a href={`mailto:${b.client_email}`}>{b.client_email}</a>}
        </div>
        <div className="badges">
          <span className={`badge ${stTone}`}>{st}</span>
          {b.kind === 'patch_test' ? <span className="badge">Patch test</span> : <span className={`badge ${dpTone}`}>{dp}</span>}
          {b.evening_surcharge > 0 && <span className="badge soft">Evening</span>}
          {b.source === 'manual' && <span className="badge soft">Added by you</span>}
          {refundable && <span className="badge soft">In 24h refund window</span>}
        </div>
        {b.allergies && <div className="extra"><b>Allergies / concerns:</b> {b.allergies}</div>}
        {b.notes && <div className="extra"><b>Notes:</b> {b.notes}</div>}
        {b.admin_note && <div className="extra" style={{ color: 'var(--danger)' }}><b>⚠</b> {b.admin_note}</div>}
      </div>
      <div className="money">
        {b.kind === 'patch_test' ? <b>Free</b> : <b>£{b.total_price}</b>}
        {paidDeposit > 0 && <span className="muted">£{paidDeposit} deposit paid</span>}
        {b.kind !== 'patch_test' && b.status !== 'completed' && !inactive && <span>£{due} due on the day</span>}
      </div>
      <div className="actions">
        {b.status === 'confirmed' && (
          <>
            <button className="btn small" disabled={busy} onClick={() => onStatus(b, 'completed')}>Completed</button>
            <button className="btn small ghost" disabled={busy} onClick={() => onStatus(b, 'no_show')}>No-show</button>
            <button className="btn small ghost" disabled={busy} onClick={() => window.confirm(`Cancel ${b.client_name}'s booking? The deposit is kept.`) && onStatus(b, 'cancelled')}>Cancel (keep deposit)</button>
          </>
        )}
        {b.status === 'confirmed' && waNumber && b.confirm_text && (
          <a className="btn small gold" href={`https://wa.me/${waNumber}?text=${encodeURIComponent(b.confirm_text)}`} target="_blank" rel="noreferrer">
            Send confirmation on WhatsApp
          </a>
        )}
        {b.deposit_status === 'paid' && b.stripe_payment_intent && (
          <button className="btn small danger" disabled={busy} onClick={() => onRefund(b)}>Refund deposit</button>
        )}
        {['cancelled', 'no_show', 'completed'].includes(b.status) && b.deposit_status !== 'refunded' && (
          <button className="btn small ghost" disabled={busy} onClick={() => onStatus(b, 'confirmed')}>Restore</button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Weekly availability ───────────────────────── */

const PRESETS = [
  ['9am–8pm', [{ start: '09:00', end: '20:00' }]],
  ['9am–5pm', [{ start: '09:00', end: '17:00' }]],
  ['Evening 5–8pm', [{ start: '17:00', end: '20:00' }]],
  ['Day off', []],
];

function Availability() {
  const thisMonday = useMemo(() => mondayOf(londonNow().date), []);
  const [start, setStart] = useState(thisMonday);
  const [days, setDays] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (s) => {
    setDays(null);
    setMsg('');
    setError('');
    try {
      const d = await api(`/api/admin/availability?start=${s}`);
      setDays(d.days);
      setDirty(false);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(start); }, [start, load]);

  function move(n) {
    if (dirty && !window.confirm('You have unsaved changes. Leave this week without saving?')) return;
    setStart(addDays(start, n * 7));
  }

  function edit(date, windows) {
    setDays((d) => ({ ...d, [date]: { ...d[date], windows } }));
    setDirty(true);
    setMsg('');
  }

  async function copyPrevious() {
    try {
      const prevStart = addDays(start, -7);
      const d = await api(`/api/admin/availability?start=${prevStart}`);
      setDays((cur) => {
        const next = { ...cur };
        for (let i = 0; i < 7; i++) next[addDays(start, i)] = { ...cur[addDays(start, i)], windows: d.days[addDays(prevStart, i)].windows };
        return next;
      });
      setDirty(true);
      setMsg('Copied last week’s hours — remember to save.');
    } catch (e) { setError(e.message); }
  }

  async function save() {
    setError('');
    // Warn about confirmed bookings that would fall outside the new hours
    const outside = [];
    for (const [date, d] of Object.entries(days)) {
      for (const b of d.bookings) {
        const ok = d.windows.some((w) => toMin(w.start) <= toMin(b.start) && toMin(w.end) >= toMin(b.end));
        if (!ok) outside.push(`${prettyDate(date, { weekday: 'short' })} ${prettyTime(b.start)} — ${b.name}`);
      }
    }
    if (outside.length && !window.confirm(`These bookings fall outside your new hours (they’ll stay booked):\n\n${outside.join('\n')}\n\nSave anyway?`)) return;

    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(days).map(([date, d]) => [date, d.windows]));
      await api('/api/admin/availability', { method: 'PUT', body: JSON.stringify({ start, days: payload }) });
      setDirty(false);
      setMsg('Saved — clients can now book these times.');
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  return (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Set the hours you can take clients each week. Clients only see times inside these hours that aren’t already booked.
      </p>
      <div className="toolbar">
        <button className="chip" onClick={() => move(-1)} disabled={start <= thisMonday}>‹ Previous</button>
        <strong style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', fontWeight: 500 }}>
          Week of {prettyDate(start, { weekday: undefined })}
        </strong>
        <button className="chip" onClick={() => move(1)}>Next ›</button>
        {start !== thisMonday && <button className="chip" onClick={() => setStart(thisMonday)}>This week</button>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn small ghost" onClick={copyPrevious} disabled={!days}>Copy last week</button>
          <button className="btn small" onClick={save} disabled={!days || saving || !dirty}>{saving ? 'Saving…' : 'Save week'}</button>
        </span>
      </div>
      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
      {!days && !error && <p className="muted">Loading…</p>}

      {days && (
        <div className="week">
          {Object.entries(days).map(([date, d]) => (
            <div key={date} className={`wday ${d.windows.length ? '' : 'off'}`}>
              <div className="dname">
                {prettyDate(date, { weekday: 'long', day: undefined, month: undefined })}
                <small>{prettyDate(date, { weekday: undefined, month: 'short' })}{d.windows.length ? '' : ' · not working'}</small>
              </div>
              <div>
                {d.windows.map((w, i) => (
                  <div className="win" key={i}>
                    <input type="time" step="900" value={w.start} onChange={(e) => edit(date, d.windows.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                    <span>to</span>
                    <input type="time" step="900" value={w.end} onChange={(e) => edit(date, d.windows.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                    <button className="x" aria-label="Remove" onClick={() => edit(date, d.windows.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
                <div className="presets">
                  {PRESETS.map(([label, w]) => <button key={label} onClick={() => edit(date, w.map((x) => ({ ...x })))}>{label}</button>)}
                  <button onClick={() => edit(date, [...d.windows, { start: '09:00', end: '12:00' }])}>+ Add hours</button>
                </div>
                {d.bookings.length > 0 && (
                  <div className="wbooked">
                    Booked: {d.bookings.map((b) => `${prettyTime(b.start)} ${b.name}`).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ───────────────────────── Add a booking manually ───────────────────────── */

function AddBooking({ onDone }) {
  const [kind, setKind] = useState('treatment');
  const [services, setServices] = useState([]);
  const [f, setF] = useState({ date: londonNow().date, time: '10:00', name: '', phone: '', email: '', notes: '', depositPaid: String(DEPOSIT) });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(s) {
    setServices((cur) => {
      if (cur.includes(s.id)) return cur.filter((x) => x !== s.id);
      if (s.group === 'lashes') return [...cur.filter((x) => SERVICES.find((y) => y.id === x)?.group !== 'lashes'), s.id];
      return [...cur, s.id];
    });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/admin/bookings', { method: 'POST', body: JSON.stringify({ ...f, kind, services }) });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit} style={{ maxWidth: 720 }}>
      <h2>Add a booking</h2>
      <p className="muted" style={{ margin: 0 }}>For clients who booked by DM or phone. This blocks the time on your website too.</p>

      <div className="toolbar" style={{ marginTop: 18 }}>
        <button type="button" className={`chip ${kind === 'treatment' ? 'on' : ''}`} onClick={() => setKind('treatment')}>Treatment</button>
        <button type="button" className={`chip ${kind === 'patch_test' ? 'on' : ''}`} onClick={() => setKind('patch_test')}>{PATCH_TEST.name}</button>
      </div>

      {kind === 'treatment' && GROUPS.map((g) => (
        <div className="svc-group" key={g.id} style={{ marginTop: 10 }}>
          <h3><span>{g.name}</span></h3>
          {SERVICES.filter((s) => s.group === g.id).map((s) => {
            const on = services.includes(s.id);
            return (
              <button type="button" key={s.id} className={`svc ${g.id === 'lashes' ? 'radio' : ''} ${on ? 'on' : ''}`} onClick={() => toggle(s)}>
                <span className="tick">{on ? '✓' : ''}</span>
                <span><span className="name">{s.name}</span><br /><span className="dur">{s.duration} mins</span></span>
                <span className="p">£{s.price}</span>
              </button>
            );
          })}
        </div>
      ))}

      <div className="form-grid">
        <label className="field">Date<input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label className="field">Start time<input type="time" step="900" required value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></label>
        <label className="field">Client name<input type="text" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label className="field">Phone<input type="tel" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="field">Email (optional)<input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        {kind === 'treatment' && (
          <label className="field">Deposit already paid (£)<input type="number" min="0" value={f.depositPaid} onChange={(e) => setF({ ...f, depositPaid: e.target.value })} /></label>
        )}
        <label className="field full">Notes<textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="bar">
        <span className="muted" style={{ fontSize: '.85rem' }}>Evening surcharge is added automatically from 5pm.</span>
        <button className="btn" disabled={busy || (kind === 'treatment' && !services.length)}>{busy ? 'Saving…' : 'Add booking'}</button>
      </div>
    </form>
  );
}

/* ───────────────────────── Settings: change password ───────────────────────── */

function Settings() {
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (f.next.trim().length < 6) return setError('Choose a password with at least 6 characters.');
    if (f.next !== f.again) return setError('The two new passwords don’t match.');
    setBusy(true);
    try {
      await api('/api/admin/password', { method: 'POST', body: JSON.stringify({ current: f.current, next: f.next }) });
      setMsg('Password changed. Use your new password next time you log in.');
      setF({ current: '', next: '', again: '' });
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <form className="panel" onSubmit={submit} style={{ maxWidth: 520 }}>
      <h2>Change password</h2>
      <p className="muted" style={{ margin: 0 }}>This is the password you use to log in to this dashboard.</p>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label className="field">Current password
          <input type="password" autoComplete="current-password" required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        </label>
        <label className="field">New password
          <input type="password" autoComplete="new-password" required value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        </label>
        <label className="field">New password again
          <input type="password" autoComplete="new-password" required value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success">{msg}</p>}
      <div className="bar">
        <span />
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </div>
    </form>
  );
}
